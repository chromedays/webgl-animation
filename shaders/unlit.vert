precision mediump float;

uniform mat4 uModelMat;
uniform mat4 uViewMat;
uniform mat4 uProjMat;
uniform float uPointSize;

attribute vec3 aPos;
attribute vec3 aColor;

varying vec3 vColor;

void main() {
    gl_PointSize = uPointSize;
    gl_Position = uProjMat * uViewMat * uModelMat * vec4(aPos, 1.0);
    vColor = aColor;
}