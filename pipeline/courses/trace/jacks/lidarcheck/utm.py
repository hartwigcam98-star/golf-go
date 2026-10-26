import math,json,numpy as np
def utm_inv(E,N,zone=15):
    a=6378137.0;f=1/298.257222101;k0=.9996;e2=f*(2-f);ep2=e2/(1-e2)   # GRS80 (NAD83)
    x=np.asarray(E)-500000.0;y=np.asarray(N);M=y/k0
    mu=M/(a*(1-e2/4-3*e2**2/64-5*e2**3/256));e1=(1-math.sqrt(1-e2))/(1+math.sqrt(1-e2))
    p1=mu+(3*e1/2-27*e1**3/32)*np.sin(2*mu)+(21*e1**2/16-55*e1**4/32)*np.sin(4*mu)+(151*e1**3/96)*np.sin(6*mu)+(1097*e1**4/512)*np.sin(8*mu)
    C1=ep2*np.cos(p1)**2;T1=np.tan(p1)**2;N1=a/np.sqrt(1-e2*np.sin(p1)**2);R1=a*(1-e2)/(1-e2*np.sin(p1)**2)**1.5;D=x/(N1*k0)
    lat=p1-(N1*np.tan(p1)/R1)*(D**2/2-(5+3*T1+10*C1-4*C1**2-9*ep2)*D**4/24+(61+90*T1+298*C1+45*T1**2-252*ep2-3*C1**2)*D**6/720)
    lon=(D-(1+2*T1+C1)*D**3/6+(5-2*C1+28*T1-3*C1**2+8*ep2+24*T1**2)*D**5/120)/np.cos(p1)
    return np.degrees(lat),(zone-1)*6-180+3+np.degrees(lon)
O=json.load(open('/home/claude/jk/origin.json'))
def to_course(E,N):
    la,lo=utm_inv(E,N);return (lo-O['lon0'])*O['K'],-(la-O['lat0'])*O['L']
if __name__=='__main__':
    print(to_course(433033.0520311787,5140261.219402245),'expect (-281.82, 518.27)')
