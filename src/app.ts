import * as R from './renderer.js'
import * as S from './scene.js'
import * as M from './math.js'
import { AdaptiveCurve, interpolateCurveDirection, interpolateCurvePosition, mat4LookAt, mat4Multiply, mat4Scale, mat4Translate, mat4Transpose, quatRotateAroundAxis, Vec3, vec3Mulf, vec3Negate } from './math.js';
import { gl } from './renderer.js';
import { animationSelector, html } from './gui.js';

async function main() {
    // let testNode = html`
    // <div>
    //     <div>${"thisistext"}</div>
    //     <div>${1.1234}</div>
    //     <input type="checkbox" id="temp" ${['click', () => {console.log('clicked!!!!!!');}]}>
    //     <div>This is list..</div>
    //     <ul>
    //         ${[...Array(10).keys()].map(i => html`<li>Item ${i}</li>`)}
    //     </ul>
    // </div>`;

    // console.log(testNode);
    // document.querySelector('#sidebar')!.appendChild(testNode);

    let model = await loadModel();
    console.log(model);
    let scene = S.parseScene(model);
    console.log(scene);
    let sceneState = new S.SceneState();

    let shaderProgram = await R.createShaderProgramFromFiles('shaders/default.vert', 'shaders/default.frag');
    let debugBonesShaderProgram = await R.createShaderProgramFromFiles('shaders/debug_bones.vert', 'shaders/debug_bones.frag');
    let unlitProgram = await R.createShaderProgramFromFiles('shaders/unlit.vert', 'shaders/unlit.frag');

    let debugBoneBuffer = new S.DebugBoneBuffer();

    sceneState.animIndex = 2;
    let animSelector = animationSelector(scene, sceneState);
    document.querySelector("#animation_selector_root")?.appendChild(animSelector);

    let drawModelButton = document.querySelector("#draw_model") as HTMLInputElement;
    let drawBonesButton = document.querySelector("#draw_bones") as HTMLInputElement;

    let oldTime = 0;

    let framerateDisplayTimer = 1;

    let camDistance = 30;

    R.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        camDistance += e.deltaY / 10;
    })

    let tickSlider = document.querySelector('#tick') as HTMLInputElement;
    tickSlider.addEventListener('input', e => {
        if (sceneState.animIndex < 0) {
            sceneState.tick = 0;
        } else {
            let anim = scene.animations[sceneState.animIndex];
            sceneState.tick = +(e.target as HTMLInputElement).value / 1000 * anim.duration;
        }
    });

    let autoPlayAnim = document.querySelector("#auto_play_anim") as HTMLInputElement;

    let mousePressed = false;

    R.canvas.addEventListener('mousedown', () => {
        mousePressed = true;
    });

    let camTheta = 90;
    let camPhi = 0;

    R.canvas.addEventListener('mousemove', (e) => {
        if (mousePressed) {
            camPhi += e.movementX;
            camTheta -= e.movementY;
            if (camTheta < 1) {
                camTheta = 1;
            } else if (camTheta > 179) {
                camTheta = 179;
            }
        }
    });

    R.canvas.addEventListener('mouseup', () => {
        mousePressed = false;
    });

    let controlPoints: Vec3[] =
        [
            [-2, 0, -20],
            [-2, 0, 2],
            [1, 0, 2],
            [3, 0, 1],
        ];
    let controlColors: Vec3[] =
        [
            [1, 0, 0],
            [1, 0, 0],
            [1, 0, 0],
            [1, 0, 0],
        ];
    controlPoints = controlPoints.map(p => vec3Mulf(p, 10));
    let controlPointBuffer = R.gl.createBuffer()!;
    let controlColorBuffer = R.gl.createBuffer()!;
    R.gl.bindBuffer(R.gl.ARRAY_BUFFER, controlPointBuffer);
    R.gl.bufferData(R.gl.ARRAY_BUFFER, new Float32Array(controlPoints.flat()), R.gl.STATIC_DRAW);
    R.gl.bindBuffer(R.gl.ARRAY_BUFFER, controlColorBuffer);
    R.gl.bufferData(R.gl.ARRAY_BUFFER, new Float32Array(controlColors.flat()), R.gl.STATIC_DRAW);
    R.gl.bindBuffer(R.gl.ARRAY_BUFFER, null);

    let curvePointBuffer = gl.createBuffer()!;
    let curveColorBuffer = gl.createBuffer()!;
    let numCurvePoints = 0;
    let curveSlider = document.querySelector("#curve_t") as HTMLInputElement;
    let curveTolerance = +curveSlider.value / 1000;
    let curve: AdaptiveCurve | null = null;

    function updateCurvePoints() {
        curve = new AdaptiveCurve(controlPoints, curveTolerance);

        R.gl.bindBuffer(R.gl.ARRAY_BUFFER, curvePointBuffer);
        R.gl.bufferData(R.gl.ARRAY_BUFFER,
            new Float32Array(curve.table.map(e => interpolateCurvePosition(controlPoints, e[0])).flat()), R.gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, curveColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array(curve.table.map(e => [e[1] / curve!.maxArcLength, 1, 1 - e[1] / curve!.maxArcLength]).flat()), gl.STATIC_DRAW);
        numCurvePoints = curve.table.length;
        R.gl.bindBuffer(R.gl.ARRAY_BUFFER, null);
    }

    updateCurvePoints();

    curveSlider.addEventListener('input', e => {
        curveTolerance = +(e.target as HTMLInputElement).value / 1000;
        updateCurvePoints();
    })

    let draw = function (time: number) {
        let dt = (time - oldTime) * 0.001;
        framerateDisplayTimer += dt;
        if (framerateDisplayTimer > 1) {
            framerateDisplayTimer -= 1;
            document.querySelector('#framerate')!.textContent = 'FPS: ' + (1 / dt).toFixed(2);
        }
        oldTime = time;

        let anim = sceneState.animIndex >= 0 ? scene.animations[sceneState.animIndex] : null;

        if (autoPlayAnim.checked && anim) {
            sceneState.tick += (dt * anim.ticksPerSecond * 0.3);
            sceneState.tick %= anim.duration;
        }
        tickSlider.value = (anim ? sceneState.tick / anim.duration * 1000 : 0).toString();

        sceneState.drawBones = drawBonesButton.checked;
        sceneState.updateTransforms(scene);
        debugBoneBuffer.update(scene, sceneState);

        R.gl.clearColor(0.2, 0.2, 0.3, 1);
        R.gl.enable(R.gl.DEPTH_TEST);
        R.gl.disable(R.gl.CULL_FACE);
        R.gl.cullFace(R.gl.BACK);
        R.gl.frontFace(R.gl.CCW);
        R.gl.clear(R.gl.COLOR_BUFFER_BIT | R.gl.DEPTH_BUFFER_BIT);
        R.gl.viewport(0, 0, R.canvas.width, R.canvas.height);

        let camHeight = 1;
        let camPos: M.Vec3 = [0, 0, 0];
        camPos[0] = Math.sin(camTheta * Math.PI / 180) * Math.cos(camPhi * Math.PI / 180) * camDistance;
        camPos[1] = camHeight + Math.cos(camTheta * Math.PI / 180) * camDistance;
        camPos[2] = Math.sin(camTheta * Math.PI / 180) * Math.sin(camPhi * Math.PI / 180) * camDistance;

        let t = +tickSlider.value / 1000;
        let arcLength = t * curve!.maxArcLength;
        t = curve!.getT(arcLength)!;
        let modelPos = interpolateCurvePosition(controlPoints, t);
        let modelRot = mat4Transpose(mat4LookAt([0, 0, 0], vec3Negate(interpolateCurveDirection(controlPoints, t)), [0, 1, 0]));
        let modelMat = mat4Multiply(mat4Translate(modelPos), mat4Multiply(modelRot, mat4Scale([0.1, 0.1, 0.1])));
        let viewMat = M.mat4LookAt(camPos, [0, camHeight, 0], [0, 1, 0]);
        let projMat = M.mat4Perspective();

        if (drawModelButton.checked) {
            S.drawScene(scene, shaderProgram, modelMat, viewMat, projMat, sceneState);
        }

        if (sceneState.drawBones) {
            debugBoneBuffer.draw(debugBonesShaderProgram, modelMat, viewMat, projMat);
        }

        R.gl.useProgram(unlitProgram.handle);
        R.setUniforms(unlitProgram, {
            'uModelMat': M.mat4Identity(),
            'uViewMat': viewMat,
            'uProjMat': projMat,
            'uPointSize': 10.0,
        });

        R.setAttribute(unlitProgram, 'aPos', controlPointBuffer, 3, 0);
        R.setAttribute(unlitProgram, 'aColor', controlColorBuffer, 3, 0);
        gl.drawArrays(gl.LINE_STRIP, 0, 4);
        gl.drawArrays(gl.POINTS, 0, 4);

        R.setAttribute(unlitProgram, 'aColor', curveColorBuffer, 3, 0);
        R.setAttribute(unlitProgram, 'aPos', curvePointBuffer, 3, 0);
        R.gl.drawArrays(R.gl.LINE_STRIP, 0, numCurvePoints);

        window.requestAnimationFrame(draw);
    };

    draw(0);
}

async function loadModel() {
    let res = await fetch('resources/model.json');
    let text = await res.text();
    let model = JSON.parse(text);
    return model;
}

main();