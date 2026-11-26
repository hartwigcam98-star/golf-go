// The power shot's flames (post-chain.js drawFlames): radial gradients added over the finished picture ("lighter"), as the web
// game's 2D overlay draws them. Each quad: uv -1..1 across it, colour r = its alpha, g = 1 for the white-hot head.
// Stops: blob 0: C0 a, .35: C1 a*.85, .75: C2 a*.45, 1: C2 0; head 0: white .95, .4: C1 .6, 1: C2 0. The colours are the canvas's
// (display) colours, so they are added in display terms and turned back into linear light for the sRGB screen.
Shader "GolfGo/Flame"
{
    Properties { _C0 ("Core", Color) = (1, 1, 1, 1) _C1 ("Middle", Color) = (1, .6, .2, 1) _C2 ("Edge", Color) = (.9, .2, .1, 1) }
    SubShader
    {
        Tags { "Queue" = "Overlay" "RenderType" = "Transparent" }
        Cull Off ZWrite Off ZTest Always Blend One One
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            float4 _C0, _C1, _C2;
            struct a2v { float4 vertex : POSITION; float2 uv : TEXCOORD0; float4 color : COLOR; };
            struct v2f { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; float4 color : COLOR; };
            v2f vert (a2v v) { v2f o; o.pos = UnityObjectToClipPos(v.vertex); o.uv = v.uv; o.color = v.color; return o; }
            float4 frag (v2f i) : SV_Target
            {
                float d = length(i.uv); if (d >= 1) discard; float a = i.color.r; float3 c;
                if (i.color.g > .5)
                {
                    float3 c0 = float3(1, 1, 1) * .95, c1 = _C1.rgb * .6, c2 = 0;
                    c = d < .4 ? lerp(c0, c1, d / .4) : lerp(c1, c2, (d - .4) / .6);
                }
                else
                {
                    float3 c0 = _C0.rgb * a, c1 = _C1.rgb * a * .85, c2 = _C2.rgb * a * .45;
                    c = d < .35 ? lerp(c0, c1, d / .35) : d < .75 ? lerp(c1, c2, (d - .35) / .4) : lerp(c2, 0, (d - .75) / .25);
                }
            #ifndef UNITY_COLORSPACE_GAMMA
                c = GammaToLinearSpace(saturate(c));
            #endif
                return float4(c, 1);
            }
            ENDCG
        }
    }
}
