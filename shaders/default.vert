precision mediump float;

uniform mat4 uModelMat;
uniform mat4 uViewMat;
uniform mat4 uProjMat;
#define MAX_NUM_BONES 16
uniform mat4 uBones[MAX_NUM_BONES];

attribute vec3 aPos;
attribute vec3 aNormal;
attribute vec4 aBoneIndices;
attribute vec4 aBoneWeights;

varying vec3 vNormal;

mat3 inverse(mat3 m) {
  float a00 = m[0][0], a01 = m[0][1], a02 = m[0][2];
  float a10 = m[1][0], a11 = m[1][1], a12 = m[1][2];
  float a20 = m[2][0], a21 = m[2][1], a22 = m[2][2];

  float b01 = a22 * a11 - a12 * a21;
  float b11 = -a22 * a10 + a12 * a20;
  float b21 = a21 * a10 - a11 * a20;

  float det = a00 * b01 + a01 * b11 + a02 * b21;

  return mat3(b01, (-a22 * a01 + a02 * a21), (a12 * a01 - a02 * a11), b11,
              (a22 * a00 - a02 * a20), (-a12 * a00 + a02 * a10), b21,
              (-a21 * a00 + a01 * a20), (a11 * a00 - a01 * a10)) /
         det;
}

mat3 transpose(mat3 m) {
  return mat3(m[0][0], m[1][0], m[2][0], m[0][1], m[1][1], m[2][1], m[0][2],
              m[1][2], m[2][2]);
}

void main() {
  mat4 boneMat = uBones[int(aBoneIndices.x)] * aBoneWeights.x +
                 uBones[int(aBoneIndices.y)] * aBoneWeights.y +
                 uBones[int(aBoneIndices.z)] * aBoneWeights.z +
                 uBones[int(aBoneIndices.w)] * aBoneWeights.w;

  gl_Position = uProjMat * uViewMat * uModelMat * boneMat * vec4(aPos, 1);
  vNormal = transpose(inverse(mat3(uModelMat * boneMat))) * aNormal;
}