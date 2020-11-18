import * as R from './renderer.js'

export function vec3Negate(v) {
    return [-v[0], -v[1], -v[2]];
}

export function vec3Add(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vec3Sub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vec3Mulf(v, s) {
    return [v[0] * s, v[1] * s, v[2] * s];
}

export function vec3Divf(v, s) {
    return [v[0] / s, v[1] / s, v[2] / s];
}

export function vec3Dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};

export function vec3Cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function vec3Length(v) {
    return Math.sqrt(vec3Dot(v, v));
}

export function vec3Normalize(v) {
    return vec3Divf(v, vec3Length(v));
}

export function vec3RotateByQuat(v, q) {
}

export function vec4Negate(v) {
    return [-v[0], -v[1], -v[2], -v[3]];
}

export function vec4Add(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
}

export function vec4Sub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]];
}

export function vec4Mulf(v, s) {
    return [v[0] * s, v[1] * s, v[2] * s, v[3] * s];
}

export function vec4Divf(v, s) {
    return [v[0] / s, v[1] / s, v[2] / s, v[3] / s];
}

export function vec4Dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}

export function vec4Normalize(v) {
    return vec4Divf(v, Math.sqrt(vec4Dot(v, v)));
}

export function mat4Identity() {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];
}

export function mat4Multiply(a, b) {
    return [
        a[0] * b[0] + a[4] * b[1] + a[8] * b[2] + a[12] * b[3],
        a[1] * b[0] + a[5] * b[1] + a[9] * b[2] + a[13] * b[3],
        a[2] * b[0] + a[6] * b[1] + a[10] * b[2] + a[14] * b[3],
        a[3] * b[0] + a[7] * b[1] + a[11] * b[2] + a[15] * b[3],
        a[0] * b[4] + a[4] * b[5] + a[8] * b[6] + a[12] * b[7],
        a[1] * b[4] + a[5] * b[5] + a[9] * b[6] + a[13] * b[7],
        a[2] * b[4] + a[6] * b[5] + a[10] * b[6] + a[14] * b[7],
        a[3] * b[4] + a[7] * b[5] + a[11] * b[6] + a[15] * b[7],
        a[0] * b[8] + a[4] * b[9] + a[8] * b[10] + a[12] * b[11],
        a[1] * b[8] + a[5] * b[9] + a[9] * b[10] + a[13] * b[11],
        a[2] * b[8] + a[6] * b[9] + a[10] * b[10] + a[14] * b[11],
        a[3] * b[8] + a[7] * b[9] + a[11] * b[10] + a[15] * b[11],
        a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12] * b[15],
        a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13] * b[15],
        a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14] * b[15],
        a[3] * b[12] + a[7] * b[13] + a[11] * b[14] + a[15] * b[15]
    ];
}

export function mat4Transpose(m) {
    return [
        m[0], m[4], m[8], m[12],
        m[1], m[5], m[9], m[13],
        m[2], m[6], m[10], m[14],
        m[3], m[7], m[11], m[15],
    ];
}

export function mat4Translate(pos) {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        pos[0], pos[1], pos[2], 1,
    ];
}

export function mat4Scale(scale) {
    return [
        scale[0], 0, 0, 0,
        0, scale[1], 0, 0,
        0, 0, scale[2], 0,
        0, 0, 0, 1,
    ];
}

export function mat4LookAt(eye, target, upAxis) {
    let look = vec3Normalize(vec3Sub(eye, target));
    let right = vec3Normalize(vec3Cross(upAxis, look));
    let up = vec3Normalize(vec3Cross(look, right));

    return [
        right[0], up[0], look[0], 0,
        right[1], up[1], look[1], 0,
        right[2], up[2], look[2], 0,
        -vec3Dot(right, eye), -vec3Dot(up, eye), -vec3Dot(look, eye), 1,
    ];
}

export function mat4Perspective() {
    let fov = 60;
    let a = R.canvas.width / R.canvas.height;
    let near = 0.1;
    let far = 1000;
    let d = 1 / Math.tan(fov * 0.5 * Math.PI / 180);
    return [
        d / a, 0, 0, 0,
        0, d, 0, 0,
        0, 0, -(far + near) / (far - near), -1,
        0, 0, (-2 * far * near) / (far - near), 0
    ];
}

export function quatGetScalarPart(q) {
    return q[3];
}

export function quatGetImaginaryPart(q) {
    return q.slice(0, 3);
}

export function quat(s, v) {
    return [...v, s];
}

export function quatIdentity() {
    return quat(1, [0, 0, 0]);
}

export function quatMultiply(a, b) {
    let s0 = quatGetScalarPart(a);
    let v0 = quatGetImaginaryPart(a);
    let s1 = quatGetScalarPart(b);
    let v1 = quatGetImaginaryPart(b);
    let s = s0 * s1 - vec3Dot(v0, v1);
    let v = vec3Add(vec3Add(vec3Mulf(v1, s0), vec3Mulf(v0, s1)), vec3Cross(v0, v1));
    return quat(s, v);
}

export function quatConjugate(q) {
    return quat(vec3Negate(quatGetImaginaryPart(q)), quatGetScalarPart(q));
}

export function quatRotateAroundAxis(axis, angle) {
    let halfAngle = angle * 0.5;
    return quat(Math.cos(halfAngle), vec3Mulf(vec3Normalize(axis), Math.sin(halfAngle)));
}

/*
export function quatRotateToVec3(from, to) {
    let axis = vec3Cross(from, to);
    let angle = Math.acos(vec3dot(from, to)) / vec3Length(to);
}
*/

export function quatToMat4(q) {
    return [
        1 - 2 * (q[1] * q[1] + q[2] * q[2]), 2 * (q[0] * q[1] + q[3] * q[2]), 2 * (q[0] * q[2] - q[3] * q[1]), 0,
        2 * (q[0] * q[1] - q[3] * q[2]), 1 - 2 * (q[0] * q[0] + q[2] * q[2]), 2 * (q[1] * q[2] + q[3] * q[0]), 0,
        2 * (q[0] * q[2] + q[3] * q[1]), 2 * (q[1] * q[2] - q[3] * q[0]), 1 - 2 * (q[0] * q[0] + q[1] * q[1]), 0,
        0, 0, 0, 1,
    ];
}

export function vec3Lerp(a, b, t) {
    return vec3Add(vec3Mulf(a, 1 - t), vec3Mulf(b, t));
}

export function quatSlerp(a, b, t) {
    let d = vec4Dot(a, b);
    if (Math.abs(d) > 0.9995) {
        return vec4Normalize(vec4Add(a, vec4Mulf(vec4Sub(b, a), t)));
    }
    if (d < 0) {
        d = -d;
        a = vec4Negate(a);
    }

    let angle = Math.acos(d);

    return vec4Mulf(vec4Add(vec4Mulf(a, Math.sin((1 - t) * angle)), vec4Mulf(b, Math.sin(t * angle))), 1 / Math.sin(angle));
}