import * as R from './renderer.js'
import * as S from './scene.js'
import * as M from './math.js'

async function main() {
    let scene;
    {
        let model = await loadModel();
        console.log(model);
        scene = S.parseScene(model);
        console.log(scene);
    }
    let sceneState = new S.SceneState();

    let shaderProgram = await R.createShaderProgramFromFiles('shaders/default.vert', 'shaders/default.frag');
    let debugBonesShaderProgram = await R.createShaderProgramFromFiles('shaders/debug_bones.vert', 'shaders/debug_bones.frag');

    let debugBoneBuffer = new S.DebugBoneBuffer();

    sceneState.animIndex = 2;
    let animSelector = document.querySelector("#animation_selector");
    {
        let div = document.createElement('div');
        let button = document.createElement('input');
        button.id = "Idle"
        button.setAttribute('type', 'radio');
        button.setAttribute('name', 'anim');
        if (sceneState.animIndex === -1) {
            button.checked = true;
        }
        let label = document.createElement('label');
        label.setAttribute('for', button.id);
        label.innerHTML = "Idle"
        button.addEventListener('click', () => {
            sceneState.animIndex = -1;
            sceneState.tick = 0;
        });
        div.appendChild(button);
        div.appendChild(label);
        animSelector.appendChild(div);
    }
    scene.animations.forEach((anim, i) => {
        let div = document.createElement('div');
        let button = document.createElement('input');
        button.id = anim.name;
        button.setAttribute('type', 'radio');
        button.setAttribute('name', 'anim');
        if (sceneState.animIndex === i) {
            button.checked = true;
        }
        let label = document.createElement('label');
        label.setAttribute('for', button.id);
        label.innerHTML = anim.name;
        button.addEventListener('click', () => {
            sceneState.animIndex = i;
            sceneState.tick = 0;
        });
        div.appendChild(button);
        div.appendChild(label);
        animSelector.appendChild(div);
    })


    let drawModelButton = document.querySelector("#draw_model");
    let drawBonesButton = document.querySelector("#draw_bones");

    let oldTime = 0;

    let framerateDisplayTimer = 1;

    let camDistance = 300;

    R.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        camDistance += e.deltaY / 10;
    })

    let tickSlider = document.querySelector('#tick');
    tickSlider.addEventListener('input', e => {
        if (sceneState.animIndex < 0) {
            sceneState.tick = 0;
        } else {
            let anim = scene.animations[sceneState.animIndex];
            sceneState.tick = e.target.value / 1000 * anim.duration;
        }
    });

    let autoPlayAnim = document.querySelector("#auto_play_anim");

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

    let draw = function (time) {
        let dt = (time - oldTime) * 0.001;
        framerateDisplayTimer += dt;
        if (framerateDisplayTimer > 1) {
            framerateDisplayTimer -= 1;
            document.querySelector('#framerate').textContent = 'FPS: ' + (1 / dt).toFixed(2);
        }
        oldTime = time;

        let anim = sceneState.animIndex >= 0 ? scene.animations[sceneState.animIndex] : null;

        if (autoPlayAnim.checked && anim) {
            sceneState.tick += (dt * anim.ticksPerSecond);
            sceneState.tick %= anim.duration;
        }
        tickSlider.value = anim ? sceneState.tick / anim.duration * 1000 : 0;

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

        let camHeight = 100;
        let camPos = [0, 0, 0];
        camPos[0] = Math.sin(camTheta * Math.PI / 180) * Math.cos(camPhi * Math.PI / 180) * camDistance;
        camPos[1] = camHeight + Math.cos(camTheta * Math.PI / 180) * camDistance;
        camPos[2] = Math.sin(camTheta * Math.PI / 180) * Math.sin(camPhi * Math.PI / 180) * camDistance;

        let viewMat = M.mat4LookAt(camPos, [0, camHeight, 0], [0, 1, 0]);
        let projMat = M.mat4Perspective();

        if (drawModelButton.checked) {
            S.drawScene(scene, shaderProgram, viewMat, projMat, sceneState);
        }
        if (sceneState.drawBones) {
            debugBoneBuffer.draw(debugBonesShaderProgram, M.mat4Identity(), viewMat, projMat);
        }

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