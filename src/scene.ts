import * as R from './renderer.js'
import * as M from './math.js'

export class Scene {
    rootNode: Node | null = null;

    nodes: Node[] = [];
    meshes: Mesh[] = [];
    animations: Animation[] = []

    static parse(model: any) {
    }
}

export class Node {
    constructor(
        public scene: Scene,

        public name: string,
        public meshIndices: number[] = [],
        public boneIndex: number = -1,
        public parentIndex: number = -1,
        public childIndices: number[] = [],

        public transform: M.Mat4 = M.mat4Identity()
    ) { }

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
    public positionBuffer: WebGLBuffer;
    public normalBuffer: WebGLBuffer;
    public boneIndexBuffer: WebGLBuffer;
    public boneWeightBuffer: WebGLBuffer;
    public indexBuffer: WebGLBuffer;

    constructor(
        positions: number[],
        normals: number[],
        boneIndices: number[],
        boneWeights: number[],
        indices: number[],
    ) {
        this.positionBuffer = R.gl.createBuffer()!;
        R.gl.bindBuffer(R.gl.ARRAY_BUFFER, this.positionBuffer);
        R.gl.bufferData(R.gl.ARRAY_BUFFER, new Float32Array(positions), R.gl.STATIC_DRAW);

        this.normalBuffer = R.gl.createBuffer()!;
        R.gl.bindBuffer(R.gl.ARRAY_BUFFER, this.normalBuffer);
        R.gl.bufferData(R.gl.ARRAY_BUFFER, new Float32Array(normals), R.gl.STATIC_DRAW);

        this.boneIndexBuffer = R.gl.createBuffer()!;

        R.gl.bindBuffer(R.gl.ARRAY_BUFFER, this.boneIndexBuffer);
        R.gl.bufferData(R.gl.ARRAY_BUFFER, new Float32Array(boneIndices), R.gl.STATIC_DRAW);

        this.boneWeightBuffer = R.gl.createBuffer()!;
        R.gl.bindBuffer(R.gl.ARRAY_BUFFER, this.boneWeightBuffer);
        R.gl.bufferData(R.gl.ARRAY_BUFFER, new Float32Array(boneWeights), R.gl.STATIC_DRAW);

        R.gl.bindBuffer(R.gl.ARRAY_BUFFER, null);

        this.indexBuffer = R.gl.createBuffer()!;
        R.gl.bindBuffer(R.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        R.gl.bufferData(R.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), R.gl.STATIC_DRAW);
        R.gl.bindBuffer(R.gl.ELEMENT_ARRAY_BUFFER, null);
    }
}

export class Mesh {
    public name: string;
    public positions: number[];
    public normals: number[];
    public indices: number[];
    public boneIndexBufferData: number[];
    public boneWeightBufferData: number[];
    public bones: Bone[];
    public numBones: number[];
    public gpu: MeshGPU;

    constructor(
        src: any,
        meshIndex: number,
    ) {
        this.name = src.name;

        this.indices = src.faces.flat();

        this.positions = [...src.vertices];
        this.normals = [...src.normals];

        this.boneIndexBufferData = this.positions.map(_ => [0, 0, 0, 0]).flat();
        this.boneWeightBufferData = this.positions.map(_ => [1, 0, 0, 0]).flat();
        this.numBones = this.positions.map(_ => 0);

        if ('bones' in src) {
            this.bones = src.bones.map((b: any, i: number) => {
                let bone = new Bone(b.name, meshIndex, M.mat4Transpose(b.offsetmatrix), b.weights.map((w: any) => new VertexWeight(w[0], w[1])));

                bone.weights.forEach(w => {
                    let index = w.vertexIndex * 4 + this.numBones[w.vertexIndex];
                    this.boneIndexBufferData[index] = i;
                    this.boneWeightBufferData[index] = w.weight;
                    ++this.numBones[w.vertexIndex];
                });

                return bone;
            });
        } else {
            this.bones = [];
        }

        this.gpu = new MeshGPU(this.positions, this.normals, this.boneIndexBufferData, this.boneWeightBufferData, this.indices);
    }

}

export class VertexWeight {
    constructor(
        public vertexIndex: number,
        public weight: number
    ) { }
}

export class Bone {
    constructor(
        public name: string,
        public meshIndex: number,
        public offsetMat: M.Mat4,
        public weights: VertexWeight[],
    ) { }
}

export class Vec3Key {
    constructor(
        public tick: number,
        public value: M.Vec3,
    ) { }
}

export class QuatKey {
    constructor(
        public tick: number,
        public value: M.Vec4,
    ) { }
}

export class NodeAnim {
    constructor(
        public name: string,
        public positionKeys: Vec3Key[],
        public scalingKeys: Vec3Key[],
        public rotationKeys: QuatKey[],
    ) { }
}

export class Animation {
    constructor(
        public name: string,
        public duration: number,
        public ticksPerSecond: number,
        public channels = new Map<string, NodeAnim>(),
    ) { }
}

export function parseScene(s: any) {

    let scene = new Scene();
    let meshBoneIndexTable = new Map();

    scene.meshes = s.meshes.map((m: any, i: number) => {
        let mesh = new Mesh(m, i);
        mesh.bones.forEach((bone, boneIndex) => {
            meshBoneIndexTable.set(bone.name, {
                meshIndex: i,
                boneIndex: boneIndex,
            });
        });
        return mesh;
    });

    let parents = [-1];
    let currNodes = [s.rootnode];
    while (currNodes.length > 0) {
        let newNodes = currNodes.map((n, i) => {
            let node = new Node(scene, n.name);
            let boneKey = node.name;
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
    }

    scene.rootNode = scene.nodes[0];

    scene.animations = s.animations.map((a: any) => {
        let anim = new Animation(
            a.name,
            a.duration,
            a.tickspersecond,
            new Map<string, NodeAnim>(a.channels.map((ch: any) => {
                let channel = new NodeAnim(ch.name,
                    ch.positionkeys.map((p: any) => {
                        let key = new Vec3Key(p[0], [...(p[1] as M.Vec3)]);
                        return key;
                    }),
                    ch.scalingkeys.map((s: any) => {
                        let key = new Vec3Key(s[0], [...(s[1] as M.Vec3)]);
                        return key;
                    }),
                    ch.rotationkeys.map((r: any) => {
                        let key = new QuatKey(r[0], M.quat(r[1][0], r[1].slice(1)));
                        return key;
                    }));
                return [channel.name, channel];
            }))
        );
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
                    let channel = anim.channels.get(node.name)!;
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
    positions: number[] = [];
    colors: number[] = [];
    indices: number[] = [];

    constructor() {
        this.positionBuffer = R.gl.createBuffer()!;
        this.colorBuffer = R.gl.createBuffer()!;
        this.indexBuffer = R.gl.createBuffer()!;
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
                if (parentTransforms[i] == null || scene.nodes[nodeIndex].name.includes('IK')) {
                    return;
                }

                let parentTransform = parentTransforms[i]!;

                this.pushVertex(
                    [parentTransform[12], parentTransform[13], parentTransform[14]],
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