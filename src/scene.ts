import * as R from './renderer.js'
import * as M from './math.js'

export class Scene {
    rootNode: Node | null  = null;

    nodes: Node[]  = [];
    meshes: Mesh[]  = [];
    animations: Animation[] = []
}

export class Node {
    scene: Scene;

    name: string;
    meshIndices: number[] = [];
    boneIndex: number  = -1;
    parentIndex: number  = -1;
    childIndices: number[]  = [];

    transform: M.Mat4  = M.mat4Identity();

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

export class MeshGPU {
    positionBuffer: WebGLBuffer;
    normalBuffer: WebGLBuffer;
    boneIndexBuffer: WebGLBuffer;
    boneWeightBuffer: WebGLBuffer;
    indexBuffer: WebGLBuffer;
}

export class Mesh {
    name: string;
    positions: number[]  = [];
    normals: number[]  = [];
    indices: number[]  = [];
    bones: Bone[]  = [];

    boneIndexBufferData: number[];
    boneWeightBufferData: number[];
    numBones: number[];

    gpu: MeshGPU;
}

export class VertexWeight {
    vertexIndex: number;
    weight: number;

    constructor(vertexIndex: number, weight: number) {
        this.vertexIndex = vertexIndex;
        this.weight = weight;
    }
}

export class Bone {
    name: string;
    meshIndex: number;
    offsetMat: M.Mat4;
    weights: VertexWeight[];
}

export class Vec3Key {
    tick: number;
    value: M.Vec3;
}

export class QuatKey {
    tick: number;
    value: M.Vec4;
}

export class NodeAnim {
    name: string;
    positionKeys: Vec3Key[];
    scalingKeys: Vec3Key[];
    rotationKeys: QuatKey[];
}

export class Animation {
    name: string;
    duration: number;
    ticksPerSecond: number;
    channels = new Map<string, NodeAnim>();
}

export function parseScene(s: any) {

    let scene = new Scene();
    let meshBoneIndexTable = new Map();

    scene.meshes = s.meshes.map((m: any, i: number) => {
        let mesh = new Mesh();
        mesh.name = m.name;

        mesh.indices = m.faces.flat();

        mesh.positions = [...m.vertices];
        mesh.normals = [...m.normals];

        mesh.boneIndexBufferData = mesh.positions.map(_ => [0, 0, 0, 0]).flat();
        mesh.boneWeightBufferData = mesh.positions.map(_ => [1, 0, 0, 0]).flat();
        mesh.numBones = mesh.positions.map(_ => 0);

        if ('bones' in m) {
            mesh.bones = m.bones.map((b: any, j: number) => {
                let bone = new Bone();
                bone.name = b.name;
                bone.meshIndex = i;
                bone.offsetMat = M.mat4Transpose(b.offsetmatrix);
                bone.weights = b.weights.map((w: any) => new VertexWeight(w[0], w[1]));
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
        mesh.gpu.positionBuffer = R.gl.createBuffer();
        R.gl.bindBuffer(R.gl.ARRAY_BUFFER, mesh.gpu.positionBuffer);
        R.gl.bufferData(R.gl.ARRAY_BUFFER, new Float32Array(mesh.positions), R.gl.STATIC_DRAW);

        mesh.gpu.normalBuffer = R.gl.createBuffer();
        R.gl.bindBuffer(R.gl.ARRAY_BUFFER, mesh.gpu.normalBuffer);
        R.gl.bufferData(R.gl.ARRAY_BUFFER, new Float32Array(mesh.normals), R.gl.STATIC_DRAW);

        mesh.gpu.boneIndexBuffer = R.gl.createBuffer()

        R.gl.bindBuffer(R.gl.ARRAY_BUFFER, mesh.gpu.boneIndexBuffer);
        R.gl.bufferData(R.gl.ARRAY_BUFFER, new Float32Array(mesh.boneIndexBufferData), R.gl.STATIC_DRAW);

        mesh.gpu.boneWeightBuffer = R.gl.createBuffer()
        R.gl.bindBuffer(R.gl.ARRAY_BUFFER, mesh.gpu.boneWeightBuffer);
        R.gl.bufferData(R.gl.ARRAY_BUFFER, new Float32Array(mesh.boneWeightBufferData), R.gl.STATIC_DRAW);

        R.gl.bindBuffer(R.gl.ARRAY_BUFFER, null);

        mesh.gpu.indexBuffer = R.gl.createBuffer();
        R.gl.bindBuffer(R.gl.ELEMENT_ARRAY_BUFFER, mesh.gpu.indexBuffer);
        R.gl.bufferData(R.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(mesh.indices), R.gl.STATIC_DRAW);
        R.gl.bindBuffer(R.gl.ELEMENT_ARRAY_BUFFER, null);

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

            node.transform = M.mat4Transpose(n.transformation);

            return node;
        });

        parents = currNodes.map((n, i) => {
            if ('children' in n) {
                return n.children.map(() => scene.nodes.length + i);
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

    scene.animations = s.animations.map((a: any) => {
        let anim = new Animation();
        anim.name = a.name;
        anim.duration = a.duration;
        anim.ticksPerSecond = a.tickspersecond;
        anim.channels = new Map<string, NodeAnim>(a.channels.map((ch: any) => {
            let channel = new NodeAnim();
            channel.name = ch.name;
            channel.positionKeys = ch.positionkeys.map((p: any) => {
                let key = new Vec3Key();
                key.tick = p[0];
                key.value = [...(p[1] as M.Vec3)];
                return key;
            });
            channel.rotationKeys = ch.rotationkeys.map((r: any) => {
                let key = new QuatKey();
                key.tick = r[0];
                key.value = M.quat(r[1][0], r[1].slice(1));
                return key;
            });
            channel.scalingKeys = ch.scalingkeys.map((s: any) => {
                let key = new Vec3Key();
                key.tick = s[0];
                key.value = [...(s[1] as M.Vec3)];
                return key;
            })
            return [channel.name, channel];
        }));
        return anim;
    });

    return scene;
}

export function drawMesh(mesh: Mesh, shaderProgram: R.ShaderProgram, boneTransforms: M.Mat4[]) {
    R.setUniforms(shaderProgram, {
        'uBones[0]': boneTransforms.flat(),
    });
    R.setAttribute(shaderProgram, 'aPos', mesh.gpu.positionBuffer, 3, 0);
    R.setAttribute(shaderProgram, 'aNormal', mesh.gpu.normalBuffer, 3, 0);
    R.setAttribute(shaderProgram, 'aBoneIndices', mesh.gpu.boneIndexBuffer, 4, 0);
    R.setAttribute(shaderProgram, 'aBoneWeights', mesh.gpu.boneWeightBuffer, 4, 0);
    R.gl.bindBuffer(R.gl.ELEMENT_ARRAY_BUFFER, mesh.gpu.indexBuffer);
    R.gl.drawElements(R.gl.TRIANGLES, mesh.indices.length, R.gl.UNSIGNED_INT, 0);
}

interface KeyFrame<T> {
    tick: number;
    value: T; 
}

export function interpolateKeyframes<T>(keyframes: KeyFrame<T>[], tick: number, lerpFunc: (a: T, b: T, t: number) => T) {
    let value = keyframes[0].value;

    if (keyframes.length > 1) {
        let currentKeyIndex = 0;
        for (let i = 0; i < keyframes.length - 1; ++i) {
            if (tick < keyframes[i + 1].tick) {
                currentKeyIndex = i;
                break;
            }
        }
        let currentKey = keyframes[currentKeyIndex];
        let nextKey = keyframes[currentKeyIndex + 1];

        let t = (tick - currentKey.tick) / (nextKey.tick - currentKey.tick);
        console.assert(t >= 0 && t <= 1, `Invalid t value ${t}`);

        value = lerpFunc(currentKey.value, nextKey.value, t);
    }

    return value;
}

export class SceneState {
    animIndex = -1;
    tick = 0;
    drawBones = false;
    nodeTransforms: M.Mat4[] = [];
    boneTransforms: M.Mat4[][] = [];

    updateTransforms(scene: Scene) {
        this.nodeTransforms = scene.nodes.map(_ => M.mat4Identity());
        this.boneTransforms = scene.meshes.map(mesh => {
            if (mesh.bones.length > 0) {
                return mesh.bones.map(() => M.mat4Identity());
            } else {
                return [M.mat4Identity()];
            }
        });

        let anim = this.animIndex >= 0 ? scene.animations[this.animIndex] : null;

        scene.nodes.forEach((node, nodeIndex) => {
            if (node.hasParent()) {
                if (anim && anim.channels.has(node.name)) {
                    let channel = anim.channels.get(node.name);
                    let v = interpolateKeyframes(channel.positionKeys, this.tick, M.vec3Lerp);
                    let q = interpolateKeyframes(channel.rotationKeys, this.tick, M.quatSlerp);
                    let s = interpolateKeyframes(channel.scalingKeys, this.tick, M.vec3Lerp);
                    let localTransform = M.mat4Multiply(M.mat4Translate(v), M.mat4Multiply(M.quatToMat4(q), M.mat4Scale(s)));
                    this.nodeTransforms[nodeIndex] = M.mat4Multiply(this.nodeTransforms[node.parentIndex], localTransform);
                } else {
                    this.nodeTransforms[nodeIndex] = M.mat4Multiply(this.nodeTransforms[node.parentIndex], node.transform);
                }
            } else {
                this.nodeTransforms[nodeIndex] = node.transform;
            }

            if (node.hasBone()) {
                let mesh = scene.meshes[node.meshIndices[0]];
                let bone = mesh.bones[node.boneIndex];
                this.boneTransforms[node.meshIndices[0]][node.boneIndex] =
                    M.mat4Multiply(this.nodeTransforms[nodeIndex], bone.offsetMat);
            }
        });
    }
};

export function drawScene(scene: Scene, shaderProgram: R.ShaderProgram, viewMat: M.Mat4, projMat: M.Mat4, state: SceneState) {
    R.gl.useProgram(shaderProgram.handle);
    R.gl.enable(R.gl.DEPTH_TEST);
    R.setUniforms(shaderProgram, {
        'uModelMat': M.mat4Identity(),
        'uViewMat': viewMat,
        'uProjMat': projMat,
    });

    scene.nodes.forEach(node => {
        if (node.hasMeshes() && !node.hasBone()) {
            node.meshIndices.forEach(meshIndex =>
                drawMesh(scene.meshes[meshIndex], shaderProgram, state.boneTransforms[meshIndex]));
        }
    });
}

export class DebugBoneBuffer {
    positionBuffer: WebGLBuffer;
    colorBuffer: WebGLBuffer;
    indexBuffer: WebGLBuffer;
    positions: number[]  = [];
    colors: number[]  = [];
    indices: number[]  = [];

    constructor() {
        this.positionBuffer = R.gl.createBuffer();
        this.colorBuffer = R.gl.createBuffer();
        this.indexBuffer = R.gl.createBuffer();
    }

    pushVertex(pos: M.Vec3, color: M.Vec3) {
        this.positions.push(...pos);
        this.colors.push(...color);
        this.indices.push(this.indices.length);
    }

    update(scene: Scene, state: SceneState) {
        [this.positions, this.colors, this.indices] = [[], [], []];

        let roots = scene.nodes.filter(node => (node.name === 'torso' || (node.hasParent() && scene.nodes[node.parentIndex].name === 'root')));
        let currNodeIndices = roots.map(node => [...node.childIndices]).flat();

        while (currNodeIndices.length > 0) {
            let currNodes = currNodeIndices.map((nodeIndex: any) => scene.nodes[nodeIndex]);
            let parentTransforms = currNodes
                .map(node => node.hasParent() ? state.nodeTransforms[node.parentIndex] : null);

            currNodeIndices.forEach((nodeIndex: any, i: number) => {
                if (scene.nodes[nodeIndex].name.includes('IK')) {
                    return;
                }

                this.pushVertex(
                    [parentTransforms[i][12], parentTransforms[i][13], parentTransforms[i][14]],
                    [1, 1, 0]);
                this.pushVertex(
                    [state.nodeTransforms[nodeIndex][12], state.nodeTransforms[nodeIndex][13], state.nodeTransforms[nodeIndex][14]],
                    [1, 1, 0]);
            })

            currNodeIndices = currNodes.map(node => node.childIndices).flat();
        }

        R.gl.bindBuffer(R.gl.ARRAY_BUFFER, this.positionBuffer);
        R.gl.bufferData(R.gl.ARRAY_BUFFER, new Float32Array(this.positions), R.gl.STATIC_DRAW);
        R.gl.bindBuffer(R.gl.ARRAY_BUFFER, this.colorBuffer);
        R.gl.bufferData(R.gl.ARRAY_BUFFER, new Float32Array(this.colors), R.gl.STATIC_DRAW);
        R.gl.bindBuffer(R.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        R.gl.bufferData(R.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.indices), R.gl.STATIC_DRAW);
    }

    draw(shaderProgram: R.ShaderProgram, modelMat: M.Mat4, viewMat: M.Mat4, projMat: M.Mat4) {
        R.gl.disable(R.gl.DEPTH_TEST);
        R.gl.useProgram(shaderProgram.handle);
        R.setUniforms(shaderProgram, {
            'uModelMat': modelMat,
            'uViewMat': viewMat,
            'uProjMat': projMat,
        });
        R.setAttribute(shaderProgram, 'aPos', this.positionBuffer, 3, 0);
        R.setAttribute(shaderProgram, 'aColor', this.colorBuffer, 3, 0);
        R.gl.bindBuffer(R.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        R.gl.drawElements(R.gl.LINES, this.indices.length, R.gl.UNSIGNED_INT, 0);
    }
}