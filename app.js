

async function main() {
    let scene;
    {
        let model = await loadModel();
        console.log(model);
        scene = parseScene(model);
        console.log(scene);
    }
    let sceneState = new SceneState();

    let shaderProgram = await createShaderProgramFromFiles('shaders/default.vert', 'shaders/default.frag');
    let debugBonesShaderProgram = await createShaderProgramFromFiles('shaders/debug_bones.vert', 'shaders/debug_bones.frag');

    let debugBoneBuffer = new DebugBoneBuffer();

    let boneBuffer = {
        vb: {
            pos: gl.createBuffer(),
            color: gl.createBuffer(),
        },
        ib: gl.createBuffer(),
        positions: [],
        colors: [],
        indices: [],
    };

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

    canvas.addEventListener('wheel', (e) => {
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

    canvas.addEventListener('mousedown', () => {
        mousePressed = true;
    });

    let camTheta = 90;
    let camPhi = 0;

    canvas.addEventListener('mousemove', (e) => {
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

    canvas.addEventListener('mouseup', () => {
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

        gl.clearColor(0.2, 0.2, 0.3, 1);
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.frontFace(gl.CCW);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, canvas.width, canvas.height);

        let camHeight = 100;
        let camPos = [0, 0, 0];
        camPos[0] = Math.sin(camTheta * Math.PI / 180) * Math.cos(camPhi * Math.PI / 180) * camDistance;
        camPos[1] = camHeight + Math.cos(camTheta * Math.PI / 180) * camDistance;
        camPos[2] = Math.sin(camTheta * Math.PI / 180) * Math.sin(camPhi * Math.PI / 180) * camDistance;

        let modelMat = mat4Identity();
        let viewMat = mat4LookAt(camPos, [0, camHeight, 0], [0, 1, 0]);
        let projMat = mat4Perspective();

        // for (let i = 0; i < meshes.length; ++i) {
        //     gl.useProgram(shaderProgram.handle);

        //     let vb = meshes[i].vb;
        //     let ib = meshes[i].ib;

        //     let boneMatrices = [];
        //     if (boneTransformsTable.has(i)) {
        //         for (let j = 0; j < boneTransformsTable.get(i).length; ++j) {
        //             boneMatrices.push(...boneTransformsTable.get(i)[j]);
        //         }
        //     } else {
        //         boneMatrices.push(...mat4Identity());
        //     }

        //     gl.enable(gl.DEPTH_TEST);

        //     setUniforms(shaderProgram, {
        //         'uBones[0]': boneMatrices,
        //         'uModelMat': modelMat,
        //         'uViewMat': viewMat,
        //         'uProjMat': projMat,
        //     });

        //     setAttribute(shaderProgram, 'aPos', vb.pos, 3, 0);
        //     setAttribute(shaderProgram, 'aNormal', vb.normal, 3, 0);
        //     setAttribute(shaderProgram, 'aBoneIndices', vb.boneIndices, 4, 0);
        //     setAttribute(shaderProgram, 'aBoneWeights', vb.boneWeights, 4, 0);
        //     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        //     if (drawModelButton.checked) {
        //         // gl.drawElements(gl.TRIANGLES, meshes[i].indices.length, gl.UNSIGNED_INT, 0);
        //     }

        //     buildBoneVertices();
        //     if (boneBuffer.positions.length > 0) {
        //         gl.disable(gl.DEPTH_TEST);
        //         gl.useProgram(debugBonesShaderProgram.handle);
        //         setUniforms(debugBonesShaderProgram, {
        //             'uModelMat': modelMat,
        //             'uViewMat': viewMat,
        //             'uProjMat': projMat,
        //         });
        //         setAttribute(debugBonesShaderProgram, 'aPos', boneBuffer.vb.pos, 3, 0);
        //         setAttribute(debugBonesShaderProgram, 'aColor', boneBuffer.vb.color, 3, 0);
        //         gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, boneBuffer.ib);
        //         if (drawBonesButton.checked) {
        //             // gl.drawElements(gl.LINES, boneBuffer.indices.length, gl.UNSIGNED_INT, 0);
        //         }
        //     }
        // }

        if (drawModelButton.checked) {
            drawScene(scene, shaderProgram, viewMat, projMat, sceneState);
        }
        if (sceneState.drawBones) {
            debugBoneBuffer.draw(debugBonesShaderProgram, mat4Identity(), viewMat, projMat);
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