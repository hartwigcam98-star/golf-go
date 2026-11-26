// The web game's shot tracer (post-chain.js r3TracerInit): a glowing ribbon along the ball's flight, added on top (additive),
// brightest down its middle, fading in from the start; op fades it out once the next shot is being lined up.
Shader "GolfGo/Tracer"
{
    Properties { _Op ("Opacity", Float) = 1 }
    SubShader
    {
        Tags { "Queue" = "Transparent+10" "RenderType" = "Transparent" "IgnoreProjector" = "True" }
        Blend One One ZWrite Off Cull Off
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            float _Op;
            struct v2f { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; };
            v2f vert (appdata_base v) { v2f o; o.pos = UnityObjectToClipPos(v.vertex); o.uv = v.texcoord.xy; return o; }
            fixed4 frag (v2f i) : SV_Target
            {
                float a = 1 - pow(abs(i.uv.y * 2 - 1), 2); float core = smoothstep(.55, 1, a);
                float3 c = float3(2.4, .34, .1) * a + float3(1.3, .55, .3) * core;
                c *= smoothstep(0, .06, i.uv.x) * _Op;
            #ifdef UNITY_COLORSPACE_GAMMA
                c = LinearToGammaSpace(saturate(c));
            #endif
                return fixed4(c, 1);
            }
            ENDCG
        }
    }
}
