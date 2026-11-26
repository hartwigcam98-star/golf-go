// The web game's light baked in Blender (shader-patches-shared-by.js, "bkOn"): over the hole, r = how much sun reaches the spot,
// g = how much open sky; the sun's light there x mix(1, r, k.x) and the sky's x mix(1, g, k.y) (B10BAKE.k = .9, .8), on the
// ground and the grass blades. Static scenery then casts no live shadows over the hole (the bake has them).
// Used as a surface shader lighting model: #pragma surface surf GG ... with SurfaceOutputGG (Standard's fields + the bake).
#ifndef GOLFGO_BAKE
#define GOLFGO_BAKE
#include "UnityPBSLighting.cginc"
sampler2D _Light; float4 _LB; float _LightOn; float4 _BkK;

struct SurfaceOutputGG
{
    fixed3 Albedo; float3 Normal; half3 Emission; half Metallic; half Smoothness; half Occlusion; fixed Alpha;
    half2 Bk;   // (sun, sky) at the spot, 1 = open
};
// the bake at a spot on the game's ground plane q = (x, -z); its image's row 0 is the rect's min y (uploaded without flipY)
half2 bakeAt (float2 q)
{
    if (_LightOn < .5) return half2(1, 1);
    float2 lu = (q - _LB.xy) / _LB.zw;
    if (lu.x <= 0. || lu.y <= 0. || lu.x >= 1. || lu.y >= 1.) return half2(1, 1);
    return tex2D(_Light, float2(lu.x, 1. - lu.y)).rg;
}
inline SurfaceOutputStandard GGStd (SurfaceOutputGG s)
{
    SurfaceOutputStandard o; o.Albedo = s.Albedo; o.Normal = s.Normal; o.Emission = s.Emission; o.Metallic = s.Metallic;
    o.Smoothness = s.Smoothness; o.Occlusion = s.Occlusion; o.Alpha = s.Alpha; return o;
}
inline half4 LightingGG (SurfaceOutputGG s, float3 viewDir, UnityGI gi)
{
    half2 k = _BkK.z > .5 ? _BkK.xy : half2(.9, .8);
    gi.light.color *= lerp(1., s.Bk.x, k.x); gi.indirect.diffuse *= lerp(1., s.Bk.y, k.y);
    return LightingStandard(GGStd(s), viewDir, gi);
}
inline void LightingGG_GI (SurfaceOutputGG s, UnityGIInput data, inout UnityGI gi) { LightingStandard_GI(GGStd(s), data, gi); }
inline half4 LightingGG_Deferred (SurfaceOutputGG s, float3 viewDir, UnityGI gi, out half4 o0, out half4 o1, out half4 o2)
{ return LightingStandard_Deferred(GGStd(s), viewDir, gi, o0, o1, o2); }
#endif
