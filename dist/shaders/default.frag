precision mediump float;

varying vec3 vNormal;

void main() {
  vec3 L0 = normalize(vec3(1, 1, 1));
  vec3 L1 = normalize(vec3(-1, 1, -1));
  vec3 N = normalize(vNormal);
  gl_FragColor = vec4(vec3(max(dot(L0, N), 0.01) + max(dot(L1, N), 0.01)), 1);
  // gl_FragColor = vec4((normalize(vNormal) + vec3(1)) * 0.5, 1);
}