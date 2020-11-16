async function main() {
    let model = await loadModel();

    let meshes = [];
    let boneTransformsTable = new Map();

    let boneMap = new Map();

    for (let i = 0; i < model.meshes.length; ++i) {
        let meshData = model.meshes[i];
        let mesh = {
            positions: [],
            normals: [],
            boneIndices: [],
            boneWeights: [],
            numBones: [],
            indices: [],
            vb: {
                pos: null,
                normal: null,
                boneIndices: null,
                boneWeights: null,
            },
            ib: null,
        };

        let boneTransforms = [];

        for (let j = 0; j < meshData.faces.length; ++j) {
            mesh.indices.push(...meshData.faces[j]);
        }
        for (let j = 0; j < meshData.vertices.length; j += 3) {
            let v = meshData.vertices;
            let n = meshData.normals;

            mesh.positions.push(v[j], v[j + 1], v[j + 2]);
            mesh.normals.push(n[j], n[j + 1], n[j + 2]);

            mesh.boneIndices.push(0, 0, 0, 0);
            mesh.boneWeights.push(1, 0, 0, 0);
            mesh.numBones.push(0);
        }

        if ('bones' in meshData) {
            for (let j = 0; j < meshData.bones.length; ++j) {
                let bone = meshData.bones[j];
                boneMap.set(bone.name, {
                    mesh: i,
                    bone: j,
                });

                boneTransforms.push(mat4Identity());

                for (let k = 0; k < bone.weights.length; ++k) {
                    let w = bone.weights[k];
                    let vi = w[0] * 4 + mesh.numBones[w[0]];
                    ++mesh.numBones[w[0]];
                    mesh.boneIndices[vi] = j;
                    mesh.boneWeights[vi] = w[1];
                }
            }
        }

        mesh.vb.pos = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vb.pos);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.positions), gl.STATIC_DRAW);

        mesh.vb.normal = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vb.normal);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW);

        mesh.vb.boneIndices = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vb.boneIndices);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.boneIndices), gl.STATIC_DRAW);

        mesh.vb.boneWeights = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vb.boneWeights);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.boneWeights), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        mesh.ib = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(mesh.indices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        meshes.push(mesh);

        if (boneTransforms.length > 0) {
            boneTransformsTable.set(i, boneTransforms);
        }
    }

    let shaderProgram = await createShaderProgramFromFiles('shaders/default.vert', 'shaders/default.frag');
    let debugBonesShaderProgram = await createShaderProgramFromFiles('shaders/debug_bones.vert', 'shaders/debug_bones.frag');

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

    let currAnim = model.animations[2];
    let channelMap = new Map();
    for (let i = 0; i < currAnim.channels.length; ++i) {
        channelMap.set(currAnim.channels[i].name, currAnim.channels[i]);
    }

    let currentTick = 0;

    function getNodeTransform(node, parentTransform) {
        let transform = parentTransform;

        if (channelMap.has(node.name)) {
            let channel = channelMap.get(node.name);
            let v = channel.positionkeys[0][1];
            if (channel.positionkeys.length > 1) {
                let currentKeyIndex = 0;
                let nextKeyIndex = 0;
                for (let i = 0; i < channel.positionkeys.length - 1; ++i) {
                    if (currentTick < channel.positionkeys[i + 1][0]) {
                        currentKeyIndex = i;
                        break;
                    }
                }
                nextKeyIndex = currentKeyIndex + 1;
                let currentKey = channel.positionkeys[currentKeyIndex];
                let nextKey = channel.positionkeys[nextKeyIndex];

                let t = (currentTick - currentKey[0]) / (nextKey[0] - currentKey[0]);
                console.assert(t >= 0 && t <= 1, 'what?');
                v = vec3Lerp(currentKey[1], nextKey[1], t);
            }
            let q = [channel.rotationkeys[0][1][1],
            channel.rotationkeys[0][1][2],
            channel.rotationkeys[0][1][3],
            channel.rotationkeys[0][1][0],
            ];
            if (channel.rotationkeys.length > 1) {
                let currentKeyIndex = 0;
                let nextKeyIndex = 0;
                for (let i = 0; i < channel.rotationkeys.length - 1; ++i) {
                    if (currentTick < channel.rotationkeys[i + 1][0]) {
                        currentKeyIndex = i;
                        break;
                    }
                }
                nextKeyIndex = currentKeyIndex + 1;
                let currentKey = channel.rotationkeys[currentKeyIndex];
                let nextKey = channel.rotationkeys[nextKeyIndex];
                let t = (currentTick - currentKey[0]) / (nextKey[0] - currentKey[0]);
                console.assert(t >= 0 && t <= 1);
                q = quatSlerp([currentKey[1][1], currentKey[1][2], currentKey[1][3], currentKey[1][0]], [nextKey[1][1], nextKey[1][2], nextKey[1][3], nextKey[1][0]], t);
                console.assert(q[0] !== NaN);
            }
            let s = channel.scalingkeys[0][1];
            if (channel.scalingkeys.length > 1) {
                let currentKeyIndex = 0;
                let nextKeyIndex = 0;
                for (let i = 0; i < channel.scalingkeys.length - 1; ++i) {
                    if (currentTick < channel.scalingkeys[i + 1][0]) {
                        currentKeyIndex = i;
                        break;
                    }
                }
                nextKeyIndex = currentKeyIndex + 1;
                let currentKey = channel.scalingkeys[currentKeyIndex];
                let nextKey = channel.scalingkeys[nextKeyIndex];
                let t = (currentTick - currentKey[0]) / (nextKey[0] - currentKey[0]);
                console.assert(t >= 0 && t <= 1, 'what?');
                s = vec3Lerp(currentKey[1], nextKey[1], t);
            }

            let localTransform = mat4Multiply(mat4Translate(v), mat4Multiply(quatToMat4(q), mat4Scale(s)));
            transform = mat4Multiply(transform, localTransform);
        } else {
            transform = mat4Multiply(transform, mat4Transpose(node.transformation));
        }

        return transform;
    }

    function buildAnimBoneAux(node, parentTransform) {
        let transform = getNodeTransform(node, parentTransform);

        if (boneMap.has(node.name)) {
            let boneInfo = boneMap.get(node.name);
            boneTransformsTable.get(boneInfo.mesh)[boneInfo.bone] =
                mat4Multiply(transform, mat4Transpose(model.meshes[boneInfo.mesh].bones[boneInfo.bone].offsetmatrix));
        }
        if ('children' in node) {
            for (let i = 0; i < node.children.length; ++i) {
                buildAnimBoneAux(node.children[i], transform);
            }
        }
    }

    let tempFlag = false;
    function buildBoneVerticesAux(parentTransform, node, depth) {
        function pushVertex(pos, color) {
            if (!tempFlag || depth < 4 || node.name.includes('IK')) return;
            boneBuffer.positions.push(...pos);
            boneBuffer.colors.push(...color);
            boneBuffer.indices.push(boneBuffer.indices.length);
        }


        if (node.name.includes('character')) {
            tempFlag = false;
        }

        pushVertex([parentTransform[12], parentTransform[13], parentTransform[14]],
            [1, 1, 0]);
        let transform = getNodeTransform(node, parentTransform);
        pushVertex([transform[12], transform[13], transform[14]],
            [1, 1, 0]);

        if (node.name.includes('root')) {
            tempFlag = true;
        }
        if ('children' in node) {
            for (let i = 0; i < node.children.length; ++i) {
                buildBoneVerticesAux(transform, node.children[i], depth + 1);
            }
        }
    }

    function buildBoneVertices() {
        boneBuffer.positions = [];
        boneBuffer.colors = [];
        boneBuffer.indices = [];
        buildBoneVerticesAux(mat4Identity(), model.rootnode, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, boneBuffer.vb.pos);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(boneBuffer.positions), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, boneBuffer.vb.color);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(boneBuffer.colors), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, boneBuffer.ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(boneBuffer.indices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    let animSelector = document.querySelector("#animation_selector");
    let buttons = '';
    for (let i = 0; i < model.animations.length; ++i) {

        let anim = model.animations[i];
        let div = document.createElement('div');
        let button = document.createElement('input');
        button.id = anim.name;
        button.setAttribute('type', 'radio');
        button.setAttribute('name', 'anim');
        if (currAnim === anim) {
            button.checked = true;
        }
        let label = document.createElement('label');
        label.setAttribute('for', button.id);
        label.innerHTML = anim.name;
        button.addEventListener('click', () => {
            currAnim = anim;
            currentTick = 0;
        });
        div.appendChild(button);
        div.appendChild(label);
        animSelector.appendChild(div);
    }

    let drawModelButton = document.querySelector("#draw_model");
    let drawBonesButton = document.querySelector("#draw_bones");

    let oldTime = 0;
    let s = 0;

    let framerateDisplayTimer = 1;

    let camDistance = 300;

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        camDistance += e.deltaY / 10;
    })

    let tickSlider = document.querySelector('#tick');
    tickSlider.addEventListener('input', e => {
        currentTick = e.target.value / 1000 * currAnim.duration;
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

        if (autoPlayAnim.checked) {
            currentTick += (dt * currAnim.tickspersecond);
            currentTick %= currAnim.duration;
        }
        tickSlider.value = currentTick / currAnim.duration * 1000;

        buildAnimBoneAux(model.rootnode, mat4Identity());

        s = Math.sin(time * 0.001);

        gl.clearColor(0.2, 0.2, 0.3, 1);
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.frontFace(gl.CCW);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, canvas.width, canvas.height);

        let camPos = [0, 0, 0];
        camPos[0] = Math.sin(camTheta * Math.PI / 180) * Math.cos(camPhi * Math.PI / 180) * camDistance;
        camPos[1] = 100 + Math.cos(camTheta * Math.PI / 180) * camDistance;
        camPos[2] = Math.sin(camTheta * Math.PI / 180) * Math.sin(camPhi * Math.PI / 180) * camDistance;

        let uniforms = {
            uModelMat: mat4Identity(),
            uViewMat: mat4LookAt(camPos, [0, 100, 0], [0, 1, 0]),
            uProjMat: mat4Perspective(),
        };

        for (let i = 0; i < meshes.length; ++i) {
            gl.useProgram(shaderProgram.handle);

            let vb = meshes[i].vb;
            let ib = meshes[i].ib;


            if (boneTransformsTable.has(i)) {
                let matrices = [];
                for (let j = 0; j < boneTransformsTable.get(i).length; ++j) {
                    matrices.push(...boneTransformsTable.get(i)[j]);
                }
                uniforms['uBones[0]'] = matrices;
            } else {
                let identityArray = [];
                for (let j = 0; j < 16; ++j) {
                    identityArray.push(...mat4Identity());
                }
                uniforms['uBones[0]'] = identityArray;
            }

            gl.enable(gl.DEPTH_TEST);

            setUniforms(shaderProgram, uniforms);
            setAttribute(shaderProgram, 'aPos', vb.pos, 3);
            setAttribute(shaderProgram, 'aNormal', vb.normal, 3);
            setAttribute(shaderProgram, 'aBoneIndices', vb.boneIndices, 4);
            setAttribute(shaderProgram, 'aBoneWeights', vb.boneWeights, 4);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
            if (drawModelButton.checked) {
                gl.drawElements(gl.TRIANGLES, meshes[i].indices.length, gl.UNSIGNED_INT, 0);
            }

            buildBoneVertices();
            if (boneBuffer.positions.length > 0) {
                gl.disable(gl.DEPTH_TEST);
                gl.useProgram(debugBonesShaderProgram.handle);
                setUniforms(debugBonesShaderProgram, uniforms);
                setAttribute(debugBonesShaderProgram, 'aPos', boneBuffer.vb.pos, 3);
                setAttribute(debugBonesShaderProgram, 'aColor', boneBuffer.vb.color, 3);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, boneBuffer.ib);
                if (drawBonesButton.checked) {
                    gl.drawElements(gl.LINES, boneBuffer.indices.length, gl.UNSIGNED_INT, 0);
                }
            }
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