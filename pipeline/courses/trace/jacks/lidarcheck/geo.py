import numpy as np
def segdist(P,poly):
    poly=np.asarray(poly);a=poly;b=np.roll(poly,-1,0);ab=b-a;t=np.clip(((P-a)*ab).sum(1)/np.maximum((ab*ab).sum(1),1e-9),0,1);q=a+ab*t[:,None];return np.min(np.hypot(*(P-q).T))
