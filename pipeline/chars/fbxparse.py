"""Minimal binary FBX reader: returns a node tree (name, props, children)."""
import struct,zlib
class Node:
    __slots__=('name','props','ch')
    def __init__(s,n,p,c):s.name=n;s.props=p;s.ch=c
    def find(s,n):
        for c in s.ch:
            if c.name==n:return c
    def findall(s,n):return [c for c in s.ch if c.name==n]
    def __repr__(s):return 'Node(%s,%d props,%d ch)'%(s.name,len(s.props),len(s.ch))
def read(path):
    d=open(path,'rb').read()
    assert d[:20]==b'Kaydara FBX Binary  ',d[:20]
    ver=struct.unpack_from('<I',d,23)[0];big=ver>=7500
    def rprop(o):
        t=chr(d[o]);o+=1
        if t=='Y':return struct.unpack_from('<h',d,o)[0],o+2
        if t=='C':return d[o]!=0,o+1
        if t=='I':return struct.unpack_from('<i',d,o)[0],o+4
        if t=='F':return struct.unpack_from('<f',d,o)[0],o+4
        if t=='D':return struct.unpack_from('<d',d,o)[0],o+8
        if t=='L':return struct.unpack_from('<q',d,o)[0],o+8
        if t in 'fdlib':
            n,enc,cl=struct.unpack_from('<III',d,o);o+=12;raw=d[o:o+cl];o+=cl
            if enc==1:raw=zlib.decompress(raw)
            fmt={'f':'f','d':'d','l':'q','i':'i','b':'?'}[t]
            return list(struct.unpack('<%d%s'%(n,fmt),raw[:n*struct.calcsize(fmt)])),o
        if t in 'SR':
            n=struct.unpack_from('<I',d,o)[0];o+=4;v=d[o:o+n];o+=n
            return (v.decode('utf8','replace') if t=='S' else v),o
        raise ValueError('prop type %r at %d'%(t,o))
    def rnode(o):
        if big:end,np,pl=struct.unpack_from('<QQQ',d,o);o+=24
        else:end,np,pl=struct.unpack_from('<III',d,o);o+=12
        nl=d[o];o+=1
        if end==0:return None,o
        name=d[o:o+nl].decode();o+=nl
        props=[]
        for _ in range(np):
            v,o=rprop(o);props.append(v)
        ch=[]
        while o<end:
            c,o2=rnode(o)
            if c is None:o=o2;break
            ch.append(c);o=o2
        return Node(name,props,ch),end
    o=27;top=[]
    while o<len(d)-200:
        n,o=rnode(o)
        if n is None:break
        top.append(n)
    return Node('root',[],top),ver

