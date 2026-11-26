// The clouds' shadows on the course (lighting-shared-by-every.js cloudShadow), drawn into the sun's cookie: each cookie texel is a line
// along the sunlight; where it meets the cloud layer 1.8 km up decides how much sun gets through (60% less under a cloud).
Shader "GolfGo/CloudShadow"
{
    SubShader
    {
        Cull Off ZWrite Off ZTest Always
        Pass
        {
            CGPROGRAM
            #pragma vertex vert_img
            #pragma fragment frag
            #pragma target 3.5
            #include "UnityCG.cginc"
            #include "GolfGoSky.cginc"
            float4 _GGLightO; float4 _GGLightR, _GGLightU; float _GGCookieS;   // the light's origin (round the camera), right and up (Unity world), cookie size
            float4 frag (v2f_img i) : SV_Target
            {
                // the instance of this (wrapping) texel nearest the camera, in the light's plane, then on to the ground's height band
                float2 o = _GGLightO.zw;   // the camera in light-space (x, y)
                float2 l = i.uv * _GGCookieS; l += _GGCookieS * round((o - l) / _GGCookieS);
                float3 p = _GGLightR.xyz * l.x + _GGLightU.xyz * l.y;   // (the light sits at the world origin)
                float3 pw = float3(p.x, p.y, -p.z);
                // slide along the sunlight to ground level (y 0), as the shading does from the surface point
                pw -= _GGSun * (pw.y / max(_GGSun.y, .2));
                float s = cloudShadowAt(pw);
                return float4(s, s, s, s);
            }
            ENDCG
        }
    }
}
