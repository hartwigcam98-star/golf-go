// The web game's sky (sky.js r3SkyMat): single-scatter blue, a warm glow and disc round the sun, drifting lit clouds; below the horizon
// the haze colour. Linear HDR, finished by GolfGo/Post. Used as the skybox (and so for the ambient light and reflections).
Shader "GolfGo/Sky"
{
    Properties { _Disc ("Sun disc", Float) = 60 }
    SubShader
    {
        Tags { "Queue" = "Background" "RenderType" = "Background" "PreviewType" = "Skybox" }
        Cull Off ZWrite Off
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 3.5
            #include "UnityCG.cginc"
            #include "GolfGoSky.cginc"
            float _Disc;
            struct v2f { float4 pos : SV_POSITION; float3 d : TEXCOORD0; };
            v2f vert (appdata_base v) { v2f o; o.pos = UnityObjectToClipPos(v.vertex); o.d = v.vertex.xyz; return o; }
            float4 frag (v2f i) : SV_Target
            {
                float3 du = normalize(i.d); float3 d = float3(du.x, du.y, -du.z);
                float3 c = skyFull(d, _Disc);
                if (d.y < 0.) c = fogCol(d) * lerp(1., .8, saturate(-d.y * 8.));
                return float4(c, 1);
            }
            ENDCG
        }
    }
}
