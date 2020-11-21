import * as R from './renderer.js'

export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];
export type Mat4 = [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];

export function degToRad(d: number): number {
    return d * Math.PI / 180;
}

export function radToDeg(r: number): number {
    return r * 180 / Math.PI;
}

export function vec3Negate(v: Vec3): Vec3 {
    return [-v[0], -v[1], -v[2]];
}

export function vec3Add(a: Vec3, b: Vec3): Vec3 {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vec3Sub(a: Vec3, b: Vec3): Vec3 {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vec3Mulf(v: Vec3, s: number): Vec3 {
    return [v[0] * s, v[1] * s, v[2] * s];
}

export function vec3Divf(v: Vec3, s: number): Vec3 {
    return [v[0] / s, v[1] / s, v[2] / s];
}

export function vec3Dot(a: Vec3, b: Vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};

export function vec3Cross(a: Vec3, b: Vec3): Vec3 {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function vec3Length(v: Vec3): number {
    return Math.sqrt(vec3Dot(v, v));
}

export function vec3Normalize(v: Vec3): Vec3 {
    return vec3Divf(v, vec3Length(v));
}

export function vec4Negate(v: Vec4): Vec4 {
    return [-v[0], -v[1], -v[2], -v[3]];
}

export function vec4Add(a: Vec4, b: Vec4): Vec4 {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
}

export function vec4Sub(a: Vec4, b: Vec4): Vec4 {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]];
}

export function vec4Mulf(v: Vec4, s: number): Vec4 {
    return [v[0] * s, v[1] * s, v[2] * s, v[3] * s];
}

export function vec4Divf(v: Vec4, s: number): Vec4 {
    return [v[0] / s, v[1] / s, v[2] / s, v[3] / s];
}

export function vec4Dot(a: Vec4, b: Vec4): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}

export function vec4Normalize(v: Vec4): Vec4 {
    return vec4Divf(v, Math.sqrt(vec4Dot(v, v)));
}

export function mat4Identity(): Mat4 {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];
}

export function mat4Multiply(a: Mat4, b: Mat4): Mat4 {
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

export function mat4Transpose(m: Mat4): Mat4 {
    return [
        m[0], m[4], m[8], m[12],
        m[1], m[5], m[9], m[13],
        m[2], m[6], m[10], m[14],
        m[3], m[7], m[11], m[15],
    ];
}

export function mat4Translate(pos: Vec3): Mat4 {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        pos[0], pos[1], pos[2], 1,
    ];
}

export function mat4Scale(scale: Vec3): Mat4 {
    return [
        scale[0], 0, 0, 0,
        0, scale[1], 0, 0,
        0, 0, scale[2], 0,
        0, 0, 0, 1,
    ];
}

export function mat4LookAt(eye: Vec3, target: Vec3, upAxis: Vec3): Mat4 {
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

export function mat4Perspective(): Mat4 {
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

export function quatGetScalarPart(q: Vec4): number {
    return q[3];
}

export function quatGetImaginaryPart(q: Vec4): Vec3 {
    return [q[0], q[1], q[2]];
}

export function quat(s: number, v: Vec3): Vec4 {
    return [...v, s];
}

export function quatIdentity(): Vec4 {
    return quat(1, [0, 0, 0]);
}

export function quatMultiply(a: Vec4, b: Vec4): Vec4 {
    let s0 = quatGetScalarPart(a);
    let v0 = quatGetImaginaryPart(a);
    let s1 = quatGetScalarPart(b);
    let v1 = quatGetImaginaryPart(b);
    let s = s0 * s1 - vec3Dot(v0, v1);
    let v = vec3Add(vec3Add(vec3Mulf(v1, s0), vec3Mulf(v0, s1)), vec3Cross(v0, v1));
    return quat(s, v);
}

export function quatConjugate(q: Vec4): Vec4 {
    return quat(quatGetScalarPart(q), vec3Negate(quatGetImaginaryPart(q)));
}

export function quatRotateAroundAxis(axis: Vec3, angle: number): Vec4 {
    let halfAngle = angle * 0.5;
    return quat(Math.cos(halfAngle), vec3Mulf(vec3Normalize(axis), Math.sin(halfAngle)));
}

/*
export function quatRotateToVec3(from, to) {
    let axis = vec3Cross(from, to);
    let angle = Math.acos(vec3dot(from, to)) / vec3Length(to);
}
*/

export function quatToMat4(q: Vec4): Mat4 {
    return [
        1 - 2 * (q[1] * q[1] + q[2] * q[2]), 2 * (q[0] * q[1] + q[3] * q[2]), 2 * (q[0] * q[2] - q[3] * q[1]), 0,
        2 * (q[0] * q[1] - q[3] * q[2]), 1 - 2 * (q[0] * q[0] + q[2] * q[2]), 2 * (q[1] * q[2] + q[3] * q[0]), 0,
        2 * (q[0] * q[2] + q[3] * q[1]), 2 * (q[1] * q[2] - q[3] * q[0]), 1 - 2 * (q[0] * q[0] + q[1] * q[1]), 0,
        0, 0, 0, 1,
    ];
}

export function vec3Lerp(a: Vec3, b: Vec3, t: number): Vec3 {
    return vec3Add(vec3Mulf(a, 1 - t), vec3Mulf(b, t));
}

export function quatSlerp(a: Vec4, b: Vec4, t: number): Vec4 {
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

export class AdaptiveCurve {
    table: number[][] = [[0, 0]];
    maxArcLength: number = 0;

    constructor(controlPoints: Vec3[], tolerance: number) {
        console.assert(controlPoints.length >= 4); // Accepts 4 control points only

        let segments = [[0, 1]];
        while (segments.length > 0) {
            let [sa, sb] = segments.shift()!;
            let sm = (sa + sb) / 2;
            let pa = interpolateCurvePosition(controlPoints, sa);
            let pb = interpolateCurvePosition(controlPoints, sb);
            let pm = interpolateCurvePosition(controlPoints, sm);
            let la = vec3Length(vec3Sub(pm, pa));
            let lb = vec3Length(vec3Sub(pb, pm));
            let lc = vec3Length(vec3Sub(pb, pa))
            let d = la + lb - lc;
            if (d < tolerance) {
                let prevLength = this.table[this.table.length - 1][1];
                this.table.push([sm, prevLength + la], [sb, prevLength + la + lb]);
                // console.log(sa, sm, sb, prevLength);
            } else {
                segments.unshift([sa, sm], [sm, sb]);
            }
            // let buf : string = '';
            // segments.forEach((s) => {
            //     buf += `(${s[0]}-${s[1]}) `;
            // });
            // console.log(buf);
        }

        let maxS = 0;
        this.table.forEach(e => {
            if (e[0] > maxS) {
                maxS = e[0];
                this.maxArcLength = e[1];
            }
        });
    }
}

export function interpolateCurvePosition(controlPoints: Vec3[], t: number): Vec3 {
    console.assert(controlPoints.length >= 4); // Accepts 4 control points only

    let t3 = t ** 3;
    let t2 = t ** 2;
    let a = vec3Mulf(controlPoints[0], -t3 + 3 * t2 - 3 * t + 1);
    let b = vec3Mulf(controlPoints[1], 3 * t3 - 6 * t2 + 3 * t);
    let c = vec3Mulf(controlPoints[2], -3 * t3 + 3 * t2);
    let d = vec3Mulf(controlPoints[3], t3);

    let result = vec3Add(vec3Add(vec3Add(a, b), c), d);

    return result;
}

export function interpolateCurveDirection(controlPoints: Vec3[], t: number): Vec3 {
    console.assert(controlPoints.length >= 4); // Accepts 4 control points only

    let t2 = t ** 2;
    let a = vec3Mulf(controlPoints[0], -3 * t2 + 6 * t - 3);
    let b = vec3Mulf(controlPoints[1], 9 * t2 - 12 * t + 3);
    let c = vec3Mulf(controlPoints[2], -9 * t2 + 6 * t);
    let d = vec3Mulf(controlPoints[3], 3 * t2);

    let result = vec3Add(vec3Add(vec3Add(a, b), c), d);
    result = vec3Normalize(result);
    return result;
}
