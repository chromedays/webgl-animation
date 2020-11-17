class Scene {
    rootNode = null; // Node

    nodes = []; // Node[]
    meshes = []; // Mesh[]
}

class Node {
    scene; // Scene

    name; // string
    meshIndices = []; // number
    boneIndex = -1; // number
    parentIndex = -1; // number
    childIndices = []; // number[]

    transform = mat4Identity(); // number[]

    hasMeshes() {
        return this.meshIndices.length > 0;
    }

    hasBone() {
        return this.boneIndex >= 0;
    }

    hasParent() {
        return this.parentIndex >= 0;
    }
}

class MeshGPU {
    positionBuffer; // WebGLBuffer
    normalBuffer; // WebGLBuffer
    boneIndexBuffer; // WebGLBuffer
    boneWeightBuffer; // WebGLBuffer
    indexBuffer; // WebGLBuffer
}

class Mesh {
    name; // string
    positions = []; // number[]
    normals = []; // number[]
    indices = []; // number[]
    bones = []; // Bone[]

    boneIndexBufferData; // number[]
    boneWeightBufferData; // number[]
    numBones; // number[]

    gpu; // MeshGPU
}

class VertexWeight {
    vertexIndex; // number
    weight; // number

    constructor(vertexIndex, weight) {
        this.vertexIndex = vertexIndex;
        this.weight = weight;
    }
}

class Bone {
    name; // string
    meshIndex; // number
    offsetMat; // number[]
    weights; // VertexWeight[]
}

class Vec3Key {
    tick; // number
    value; // number[3]
}

class QuatKey {
    tick; // number
    value; // number[4]
}

class NodeAnim {
    name; // string
    positionKeys; // Vec3Key[]
    scalingKeys; // Vec3Key[]
    rotationKeys; // QuatKey[]
}

class Animation {
    name; // string
    duration; // number
    ticksPerSecond; // number   
}

function parseScene(s) {
    let scene = new Scene();
    let meshBoneIndexTable = new Map();

    scene.meshes = s.meshes.map((m, i) => {
        let mesh = new Mesh();
        mesh.name = m.name;

        mesh.indices = m.faces.flat();

        mesh.positions = [...m.vertices];
        mesh.normals = [...m.normals];

        mesh.boneIndexBufferData = mesh.positions.map(_ => [0, 0, 0, 0]).flat();
        mesh.boneWeightBufferData = mesh.positions.map(_ => [1, 0, 0, 0]).flat();
        mesh.numBones = mesh.positions.map(_ => 0);

        if ('bones' in m) {
            mesh.bones = m.bones.map((b, j) => {
                let bone = new Bone();
                bone.name = b.name;
                bone.meshIndex = i;
                bone.offsetMat = mat4Transpose(b.offsetmatrix);
                bone.weights = b.weights.map(w => new VertexWeight(w[0], w[1]));
                meshBoneIndexTable.set(bone.name, {
                    meshIndex: i,
                    boneIndex: j,
                });

                bone.weights.forEach(w => {
                    let index = w.vertexIndex * 4 + mesh.numBones[w.vertexIndex];
                    mesh.boneIndexBufferData[index] = j;
                    mesh.boneWeightBufferData[index] = w.weight;
                    ++mesh.numBones[w.vertexIndex];
                });

                return bone;
            });
        }

        mesh.gpu = new MeshGPU();
        mesh.gpu.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.gpu.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.positions), gl.STATIC_DRAW);

        mesh.gpu.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.gpu.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW);

        mesh.gpu.boneIndexBuffer = gl.createBuffer()

        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.gpu.boneIndexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.boneIndexBufferData), gl.STATIC_DRAW);

        mesh.gpu.boneWeightBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.gpu.boneWeightBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.boneWeightBufferData), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        mesh.gpu.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.gpu.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(mesh.indices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        return mesh;
    });

    let parents = [-1];
    let currNodes = [s.rootnode];
    while (currNodes.length > 0) {
        let newNodes = currNodes.map((n, i) => {
            let node = new Node();
            node.scene = scene;
            let boneKey = node.name = n.name;
            if (meshBoneIndexTable.has(boneKey)) {
                let { meshIndex, boneIndex } = meshBoneIndexTable.get(boneKey);
                node.meshIndices = [meshIndex];
                node.boneIndex = boneIndex;
            } else if ('meshes' in n) {
                node.meshIndices = [...n.meshes]
            }
            node.parentIndex = parents[i];
            if (node.hasParent()) {
                let parent = scene.nodes[node.parentIndex];
                parent.childIndices.push(scene.nodes.length + i);
                // console.log(parent.name, '->', node.name);
            } else {
                // console.log('->', node.name);
            }

            node.transform = mat4Transpose(n.transformation);

            return node;
        });

        parents = currNodes.map((n, i) => {
            if ('children' in n) {
                return n.children.map(_ => scene.nodes.length + i);
            } else {
                return [];
            }
        }).flat();

        scene.nodes.push(...newNodes);

        currNodes = currNodes.map(n => {
            if ('children' in n) {
                return n.children;
            } else {
                return [];
            }
        }).flat();

        // console.log('Scene Nodes:', scene.nodes);
        // console.log('Currents:', currNodes);
        // console.log('Parents:', parents);
    }

    scene.rootNode = scene.nodes[0];

    return scene;
}

function drawMesh(mesh, shaderProgram, boneTransforms) {
    setUniforms(shaderProgram, {
        'uBones[0]': boneTransforms.flat(),
    });
    setAttribute(shaderProgram, 'aPos', mesh.gpu.positionBuffer, 3, 0);
    setAttribute(shaderProgram, 'aNormal', mesh.gpu.normalBuffer, 3, 0);
    setAttribute(shaderProgram, 'aBoneIndices', mesh.gpu.boneIndexBuffer, 4, 0);
    setAttribute(shaderProgram, 'aBoneWeights', mesh.gpu.boneWeightBuffer, 4, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.gpu.indexBuffer);
    gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_INT, 0);
}

function drawScene(scene, shaderProgram, viewMat, projMat) {
    gl.useProgram(shaderProgram.handle);
    gl.enable(gl.DEPTH_TEST);
    setUniforms(shaderProgram, {
        'uViewMat': viewMat,
        'uProjMat': projMat,
    });

    let nodeTransforms = scene.nodes.map(_ => mat4Identity());
    let boneTransforms = scene.meshes.map(mesh => {
        if (mesh.bones.length > 0) {
            return mesh.bones.map(_ => mat4Identity());
        } else {
            return [mat4Identity()];
        }
    });

    scene.nodes.forEach((node, nodeIndex) => {
        if (node.hasParent()) {
            nodeTransforms[nodeIndex] = mat4Multiply(nodeTransforms[node.parentIndex], node.transform);
        } else {
            nodeTransforms[nodeIndex] = node.transform;
        }

        if (node.hasBone()) {
            let mesh = scene.meshes[node.meshIndices[0]];
            let bone = mesh.bones[node.boneIndex];
            boneTransforms[node.meshIndices[0]][node.boneIndex] = mat4Multiply(nodeTransforms[nodeIndex], bone.offsetMat);
        }
    });

    scene.nodes.forEach(node => {
        if (node.hasMeshes()) {
            setUniforms(shaderProgram, {
                'uModelMat': mat4Identity(),
            });
            node.meshIndices.forEach(meshIndex =>
                drawMesh(scene.meshes[meshIndex], shaderProgram, boneTransforms[meshIndex]));
        }
    });
}