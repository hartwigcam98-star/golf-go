// The web game's far trees (real-tree-positions-from.js R3T_IMP_VS + R3.mat.imp): pictures of the tree models (the atlas r3tImpBake
// drew), each a card standing up and turned to the camera, lit as a rounded crown, alpha-tested (held up in the small mips), tinted,
// a little light through when looking toward the sun. Per tree: _Far[i] (the web's world; Unity's z is turned round here).
Shader "GolfGo/Far"
{
    Properties { _MainTex ("Tree picture atlas", 2D) = "white" {} }
    SubShader
    {
        Tags { "RenderType" = "TransparentCutout" "Queue" = "AlphaTest" }
        Cull Off
        CGPROGRAM
        #pragma surface surf Standard vertex:vert
        #pragma multi_compile_instancing
        #pragma instancing_options procedural:setupF
        #pragma target 4.5
        #include "GolfGoSky.cginc"
        sampler2D _MainTex; float4 _MainTex_TexelSize;
        struct FarTree { float3 p; float4 s; float4 r; float3 c; };
        #ifdef UNITY_PROCEDURAL_INSTANCING_ENABLED
            StructuredBuffer<FarTree> _Far;
        #endif
        void setupF ()
        {
        #ifdef UNITY_PROCEDURAL_INSTANCING_ENABLED
            unity_ObjectToWorld = float4x4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1); unity_WorldToObject = unity_ObjectToWorld;
        #endif
        }
        struct Input { float2 uvA; float3 tint; float3 worldPos; };
        void vert (inout appdata_full v, out Input o)
        {
            UNITY_INITIALIZE_OUTPUT(Input, o);
            FarTree t = (FarTree)0;
        #ifdef UNITY_PROCEDURAL_INSTANCING_ENABLED
            t = _Far[unity_InstanceID];
        #endif
            float3 toE = _GGE - t.p; float2 hz = normalize(toE.xz + float2(1e-4, 0)); float3 rgt = float3(hz.y, 0, -hz.x);
            float3 n = normalize(float3(hz.x, 0, hz.y) * .75 + rgt * v.vertex.x * 1.3 + float3(0, v.vertex.y * .9 - .15, 0));
            float3 p = t.p + rgt * v.vertex.x * t.s.x + float3(0, v.vertex.y * t.s.y, 0);
            v.vertex = float4(p.x, p.y, -p.z, 1); v.normal = float3(n.x, n.y, -n.z);
            float2 uv = v.texcoord.xy;
            o.uvA = float2(lerp(t.r.x, t.r.z, t.s.z > 0 ? uv.x : 1 - uv.x), lerp(t.r.y, t.r.w, uv.y)); o.tint = t.c;
        }
        void surf (Input IN, inout SurfaceOutputStandard o)
        {
            float4 c = tex2D(_MainTex, IN.uvA);
            float2 ts = IN.uvA * _MainTex_TexelSize.zw, qx = ddx(ts), qy = ddy(ts); float lod = .5 * log2(max(max(dot(qx, qx), dot(qy, qy)), 1e-6));
            clip(c.a * (1 + max(lod, 0) * .2) - .5);
            float3 alb = c.rgb * IN.tint;
            float3 vv = normalize(_WorldSpaceCameraPos - IN.worldPos);
            o.Emission = alb * _LightColor0.rgb * .3 * pow(max(dot(-vv, _WorldSpaceLightPos0.xyz), 0), 3);
            o.Albedo = alb; o.Smoothness = 1 - .85; o.Metallic = 0; o.Alpha = 1;
        }
        ENDCG
    }
}
