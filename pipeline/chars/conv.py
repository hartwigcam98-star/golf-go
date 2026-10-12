import numpy as np,math,json
from fbxparse import read
TICK=46186158000
def props70(n):
    out={};p=n.find('Properties70')
    if p:
        for c in p.ch:out[c.props[0]]=c.props[4:]
    return out
def euler(v,order=0):
    x,y,z=[math.radians(a) for a in v]
    cx,sx,cy,sy,cz,sz=math.cos(x),math.sin(x),math.cos(y),math.sin(y),math.cos(z),math.sin(z)
    Rx=np.array([[1,0,0],[0,cx,-sx],[0,sx,cx]]);Ry=np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]]);Rz=np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]])
    return {0:Rz@Ry@Rx,1:Ry@Rz@Rx,2:Rx@Rz@Ry,3:Rz@Rx@Ry,4:Ry@Rx@Rz,5:Rx@Ry@Rz}[order]
def m4(R=None,t=None,s=None):
    M=np.eye(4)
    if R is not None:M[:3,:3]=R
    if s is not None:M[:3,:3]=M[:3,:3]@np.diag(s)
    if t is not None:M[:3,3]=t
    return M
class Scene:
    def __init__(s,path):
        r,ver=read(path);s.root=r;obj=r.find('Objects');s.obj={}
        for c in obj.ch:s.obj[c.props[0]]=c
        s.parent={};s.children={};s.opc=[]
        for c in r.find('Connections').ch:
            k=c.props[0]
            if k=='OO':s.parent.setdefault(c.props[1],[]).append(c.props[2])
            elif k=='OP':s.opc.append((c.props[1],c.props[2],c.props[3]))
        s.models={i:o for i,o in s.obj.items() if o.name=='Model'}
        s.P={i:props70(o) for i,o in s.models.items()}
    def mparent(s,i):
        for p in s.parent.get(i,[]):
            if p in s.models:return p
        return None
    def local(s,i,T=None,R=None,S=None):
        P=s.P[i];g=lambda k,d:np.array(P[k][:3],float) if k in P else np.array(d,float)
        t=g('Lcl Translation',[0,0,0]) if T is None else T;r=g('Lcl Rotation',[0,0,0]) if R is None else R;sc=g('Lcl Scaling',[1,1,1]) if S is None else S
        pre=g('PreRotation',[0,0,0]);post=g('PostRotation',[0,0,0]);ro=int(P.get('RotationOrder',[0])[0])
        rp=g('RotationPivot',[0,0,0]);roff=g('RotationOffset',[0,0,0]);sp=g('ScalingPivot',[0,0,0]);soff=g('ScalingOffset',[0,0,0])
        return m4(t=t)@m4(t=roff)@m4(t=rp)@m4(euler(pre))@m4(euler(r,ro))@m4(np.linalg.inv(euler(post)))@m4(t=-rp)@m4(t=soff)@m4(t=sp)@m4(s=sc)@m4(t=-sp)
    def anim(s):
        # curve nodes -> model property; curves -> curve node channel
        cn={};curves={}
        for ch,par,pn in s.opc:
            o=s.obj.get(ch)
            if o is None:continue
            if o.name=='AnimationCurveNode' and par in s.models:cn[ch]=(par,pn)
        for ch,par,pn in s.opc:
            o=s.obj.get(ch)
            if o is not None and o.name=='AnimationCurve' and par in cn:
                kt=np.array(o.find('KeyTime').props[0],float)/TICK;kv=np.array(o.find('KeyValueFloat').props[0],float)
                curves.setdefault(par,{})[pn]=(kt,kv)
        tracks={}
        for nid,(mid,pn) in cn.items():
            tracks.setdefault(mid,{})[pn]=curves.get(nid,{})
        return tracks
def sample(s,tracks,t):
    def val(mid,pn,base):
        tr=tracks.get(mid,{}).get(pn)
        if not tr:return None
        out=np.array(base,float)
        for k,c in enumerate('XYZ'):
            cv=tr.get('d|'+c)
            if cv:out[k]=np.interp(t,cv[0],cv[1])
        return out
    W={}
    order=[]
    def wm(i):
        if i in W:return W[i]
        P=s.P[i];g=lambda k,d:P[k][:3] if k in P else d
        L=s.local(i,val(i,'Lcl Translation',g('Lcl Translation',[0,0,0])),val(i,'Lcl Rotation',g('Lcl Rotation',[0,0,0])),val(i,'Lcl Scaling',g('Lcl Scaling',[1,1,1])))
        p=s.mparent(i);W[i]=(wm(p)@L) if p is not None else L;return W[i]
    for i in s.models:wm(i)
    return W
def names(s):return {i:o.props[1].split('\x00')[0].replace('mixamorig:','') for i,o in s.models.items()}

