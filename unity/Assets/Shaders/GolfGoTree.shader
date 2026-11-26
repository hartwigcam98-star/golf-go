// The web game's species trees (arm-ik.js R3T, shader-patches-shared-by.js r3Patch), three materials in one shader:
//   _Kind 0 bark  (R3.mat.bark: vertex colour x bark photo (raw) x 2.5, its normal map x 1.2, roughness .92)
//   _Kind 1 mass  (R3.mat.tree: the crowns' inner masses, vertex colour, roughness .85, a little light through: translucent .3, ^4)
//   _Kind 2 leaf  (R3.mat.sleaf: the species leaf atlas (sRGB, flipY false), alpha test .5 held up in the small mips, both faces lit
//                 alike, roughness .72, wind sway, light through the leaves: translucent .5, ^3)
// Vertex colours are the web game's linear colours. Each tree's tint (instanceColor) is _Tint, per instance.
Shader "GolfGo/Tree"
{
    Properties
    {
        _MainTex ("Bark photo / leaf atlas", 2D) = "white" {}
        _BumpMap ("Bark normal map", 2D) = "bump" {}
        _Kind ("0 bark, 1 mass, 2 leaf", Float) = 0
        _Cull ("Cull", Float) = 2
        _Tint ("Tint", Color) = (1, 1, 1, 1)
        _Raw ("Vertex colours already linear (built things)", Float) = 0
    }
    SubShader
    {
        Tags { "RenderType" = "TransparentCutout" "Queue" = "AlphaTest" }
        Cull [_Cull]
        CGPROGRAM
        #pragma surface surf Standard vertex:vert addshadow fullforwardshadows
        #pragma multi_compile_instancing
        #pragma target 3.5
        sampler2D _MainTex, _BumpMap; float4 _MainTex_TexelSize; float _Kind, _Raw;
        UNITY_INSTANCING_BUFFER_START(Props)
            UNITY_DEFINE_INSTANCED_PROP(float4, _Tint)
        UNITY_INSTANCING_BUFFER_END(Props)
        struct Input { float2 uv_MainTex; float4 color : COLOR; float3 worldPos; float3 viewDir; };

        void vert (inout appdata_full v)
        {
            if (_Kind > 1.5)
            {   // wind: the higher up the tree, the more it sways (the web's x and z; this mesh is mirrored in z)
                float4 wq = mul(unity_ObjectToWorld, v.vertex); float wx = wq.x, wz = -wq.z;
                float hh = saturate(v.vertex.y * .04);
                v.vertex.x += sin(_Time.y * 1.3 + wx * .21 + wz * .17) * .07 * hh;
                v.vertex.z -= cos(_Time.y * 1.1 + wz * .19) * .05 * hh;
            }
        }
        void surf (Input IN, inout SurfaceOutputStandard o)
        {
            float4 tint = UNITY_ACCESS_INSTANCED_PROP(Props, _Tint);
            // the trees' colours are the web's display-space colours / 2, squared into linear light as r3Geo does; built things' are linear
            float3 c0 = IN.color.rgb * 2; float3 vc = (_Raw > .5 ? IN.color.rgb : c0 * c0) * tint.rgb;
            float3 alb = vc; float a = 1;
            if (_Kind < .5)
            {
                float3 ph = tex2D(_MainTex, IN.uv_MainTex).rgb;   // raw data, as the web samples it
                alb = vc * ph * 2.5;
                float3 n = UnpackNormal(tex2D(_BumpMap, IN.uv_MainTex)); n.xy *= 1.2; o.Normal = normalize(n);
                o.Smoothness = 1 - .92;
            }
            else if (_Kind < 1.5) o.Smoothness = 1 - .85;
            else
            {
                float2 uv = float2(IN.uv_MainTex.x, 1 - IN.uv_MainTex.y);   // (the atlas is uploaded without flipY)
                float4 t = tex2D(_MainTex, uv);
                float2 ts = uv * _MainTex_TexelSize.zw, qx = ddx(ts), qy = ddy(ts);
                float lod = .5 * log2(max(max(dot(qx, qx), dot(qy, qy)), 1e-6));
                a = t.a * (1 + max(lod, 0) * .2);
                clip(a - .5);
                alb = vc * t.rgb;
                o.Smoothness = 1 - .72;
            }
            // light through the crown when looking toward the sun (the web adds it to the direct diffuse light)
            if (_Kind > .5)
            {
                float k = _Kind > 1.5 ? .5 : .3, p = _Kind > 1.5 ? 3 : 4;
                float3 vv = normalize(_WorldSpaceCameraPos - IN.worldPos);
                o.Emission = alb * _LightColor0.rgb * k * pow(max(dot(-vv, _WorldSpaceLightPos0.xyz), 0), p);
            }
        #ifdef UNITY_COLORSPACE_GAMMA
            alb = LinearToGammaSpace(alb); o.Emission = LinearToGammaSpace(o.Emission);
        #endif
            o.Albedo = alb; o.Alpha = 1; o.Metallic = 0;
        }
        ENDCG
    }
    FallBack "Legacy Shaders/Transparent/Cutout/VertexLit"
}
