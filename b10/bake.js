/* Blender trial (?b10=1): per-course data. courses[id].holes[index] = this hole's light baked in Cycles (R sun, G sky) with its
   bounds; clubs[id] = version of b10/club/<id>.js (the game's clubhouse run through Blender). k = [sun strength, sky strength]. */
window.B10BAKE={k:[.9,.8],
courses:{troy:{holes:{
0:{b:[-52,-270,690,355],png:'b10/light/troy/h01.webp?v=1'},
1:{b:[-93,-505,186,549],png:'b10/light/troy/h02.webp?v=1'},
2:{b:[-229,-199,309,288],png:'b10/light/troy/h03.webp?v=1'},
3:{b:[-55,-87,452,218],png:'b10/light/troy/h04.webp?v=1'},
4:{b:[-139,-48,223,672],png:'b10/light/troy/h05.webp?v=1'},
5:{b:[-127,-60,215,459],png:'b10/light/troy/h06.webp?v=1'},
6:{b:[-443,-88,504,244],png:'b10/light/troy/h07.webp?v=1'},
7:{b:[-56,-135,347,222],png:'b10/light/troy/h08.webp?v=1'},
8:{b:[-519,-89,582,279],png:'b10/light/troy/h09.webp?v=1'},
9:{b:[-88,-418,341,499],png:'b10/light/troy/h10.webp?v=1'},
10:{b:[-90,-234,256,305],png:'b10/light/troy/h11.webp?v=1'},
11:{b:[-89,-520,353,599],png:'b10/light/troy/h12.webp?v=1'},
12:{b:[-252,-103,300,187],png:'b10/light/troy/h13.webp?v=1'},
13:{b:[-142,-41,223,561],png:'b10/light/troy/h14.webp?v=1'},
14:{b:[-147,-69,237,271],png:'b10/light/troy/h15.webp?v=1'},
15:{b:[-245,-44,339,685],png:'b10/light/troy/h16.webp?v=1'},
16:{b:[-134,-46,235,551],png:'b10/light/troy/h17.webp?v=1'},
17:{b:[-89,-469,429,548],png:'b10/light/troy/h18.webp?v=1'}
}}},
clubs:{caledonia:1,chaska:1,crls:1,crsc:1,deacon:1,desertcanyon:1,dove:1,edinburgh:1,farmlinks:1,gnlake:1,gnlinks:1,hazeltine:1,heritage:1,interlachen:1,jewel:1,judge:1,legend:1,legends:1,legislator:1,lehman:1,lido:1,lookout:1,maddens:1,mammoth:1,mystic:1,northfork:1,orangeburg:1,pawplant:1,pines:1,preserve:1,prestwick:1,quarry:1,ridge:1,ridges:1,rossbridge:1,sandvalley:1,santee:1,sedge:1,senator:1,slbm:1,slmh:1,stoneridge:1,troy:1,trueblue:1,valley:1,wigwam:1,wilderness:1,willingers:1,windsong:1,wyboo:1}};
