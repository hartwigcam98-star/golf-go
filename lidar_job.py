# Fetches real lidar for the golf game's greens. Runs on GitHub Actions (see .github/workflows/lidar.yml).
# 1) USGS 3DEP 1 m elevation for each course, in square UTM metres (no stretched pixels).
# 2) The raw USGS lidar ground points around every green, from the public AWS point-cloud archive.
# Results are pushed to the "lidar-data" branch. Nothing on the main branch or the live site is touched.
import json, math, os, sys, time, io, traceback
import numpy as np, requests
from concurrent.futures import ProcessPoolExecutor, as_completed
CFG = json.loads(r"""{"troy":{"epsg":26915,"ext":[-92.75000577288165,44.88578003615638,-92.72786312711833,44.91214576384362],"greens":[[-92.733955,44.8983684,-92.7331038,44.8989324,["USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016","WI_StWide_4_StCroix_2021"]],[-92.7338357,44.9031044,-92.7328999,44.9037444,["WI_StWide_4_StCroix_2021"]],[-92.7348018,44.9042514,-92.7339552,44.9049047,["USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016","WI_StWide_4_StCroix_2021"]],[-92.732581,44.904884,-92.7317321,44.9054546,["WI_StWide_4_StCroix_2021"]],[-92.7328638,44.899761,-92.7318758,44.9004573,["WI_StWide_4_StCroix_2021"]],[-92.7325147,44.8963953,-92.7316484,44.8970172,["WI_StWide_4_StCroix_2021"]],[-92.736512,44.8952268,-92.7356503,44.8958164,["USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016","WI_StWide_4_StCroix_2021"]],[-92.7334401,44.896148,-92.7325413,44.8967765,["WI_StWide_4_StCroix_2021"]],[-92.7398112,44.8962646,-92.7389658,44.8968518,["MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016","WI_StWide_4_StCroix_2021"]],[-92.7419671,44.8987604,-92.7411831,44.8993641,["MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016","WI_StWide_4_StCroix_2021"]],[-92.7417607,44.9009593,-92.7409293,44.9015621,["MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016","WI_StWide_4_StCroix_2021"]],[-92.739474,44.9042051,-92.7385242,44.904817,["MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016","WI_StWide_4_StCroix_2021"]],[-92.7399669,44.9048691,-92.7390786,44.9054471,["MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016","WI_StWide_4_StCroix_2021"]],[-92.7413039,44.9014447,-92.7405825,44.9021071,["MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016","WI_StWide_4_StCroix_2021"]],[-92.7431164,44.9004838,-92.7422802,44.9011677,["MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016","WI_StWide_4_StCroix_2021"]],[-92.7449763,44.8953004,-92.7441622,44.8960405,["MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016","WI_StWide_4_StCroix_2021"]],[-92.74658,44.8928113,-92.7457021,44.893424,["MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016","WI_StWide_4_StCroix_2021"]],[-92.7429156,44.8956593,-92.7420841,44.8963052,["MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016","WI_StWide_4_StCroix_2021"]]]},"stoneridge":{"epsg":26915,"ext":[-92.84272172051355,44.94340409707623,-92.81657597948644,44.96349570292376],"greens":[[-92.8332163,44.9531027,-92.832421,44.953623,["MN_CentralMissRiver_5_B22","MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016"]],[-92.8387698,44.9518058,-92.8380093,44.952437,["MN_CentralMissRiver_5_B22","MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016"]],[-92.8389226,44.9493856,-92.8381296,44.9500391,["MN_CentralMissRiver_5_B22","MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016"]],[-92.8329288,44.9519538,-92.8321323,44.9525651,["MN_CentralMissRiver_5_B22","MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016"]],[-92.8369317,44.949795,-92.8360795,44.9504526,["MN_CentralMissRiver_5_B22","MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016"]],[-92.833583,44.9494608,-92.8326403,44.949972,["MN_CentralMissRiver_5_B22","MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016"]],[-92.8350443,44.9500638,-92.8340017,44.9506478,["MN_CentralMissRiver_5_B22","MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016"]],[-92.8311423,44.9521539,-92.8302855,44.9526932,["MN_CentralMissRiver_5_B22","MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016"]],[-92.8275107,44.9506154,-92.8266365,44.9512076,["MN_CentralMissRiver_5_B22","MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016"]],[-92.8321053,44.9498131,-92.8313297,44.950455,["MN_CentralMissRiver_5_B22","MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016"]],[-92.8269399,44.9496625,-92.8261075,44.950354,["MN_CentralMissRiver_5_B22","MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016"]],[-92.8243388,44.9530273,-92.8234993,44.9537221,["MN_CentralMissRiver_5_B22","MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016"]],[-92.8259623,44.9544227,-92.8250509,44.9549421,["MN_CentralMissRiver_5_B22","MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016"]],[-92.8272122,44.955115,-92.8263739,44.9557122,["MN_CentralMissRiver_5_B22","MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016"]],[-92.8228458,44.9539288,-92.821997,44.9545517,["MN_CentralMissRiver_5_B22","MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016"]],[-92.8244412,44.955713,-92.823437,44.9562969,["MN_CentralMissRiver_5_B22","MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016"]],[-92.8286011,44.9567643,-92.8278278,44.9573318,["MN_CentralMissRiver_5_B22","MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016"]],[-92.8293013,44.9522457,-92.8285489,44.9530183,["MN_CentralMissRiver_5_B22","MN_FullState","USGS_LPC_MN_Phase4_Metro_F_2011_LAS_2016"]]]},"caledonia":{"epsg":26917,"ext":[-79.15993435571154,33.44542198291204,-79.14124354428846,33.460624417087956],"greens":[[-79.1505543,33.4495274,-79.1498554,33.4501145,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1464404,33.4540857,-79.1457081,33.4545894,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1452101,33.4555714,-79.144454,33.4562735,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1491192,33.4556272,-79.1482972,33.4561945,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1532589,33.455691,-79.1525876,33.4563294,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1538573,33.453261,-79.153177,33.4540432,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1510813,33.4522568,-79.1501932,33.4529407,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1549582,33.4512902,-79.1541775,33.4518063,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.156316,33.4516969,-79.1554122,33.4521833,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1503507,33.4500803,-79.1495967,33.4505948,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1498964,33.4512029,-79.1491886,33.4518644,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1473438,33.4541083,-79.1464509,33.4546485,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1495817,33.4534129,-79.1489389,33.4539951,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1532568,33.4525911,-79.1524357,33.4532172,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1496135,33.4552104,-79.1488939,33.4558281,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1533401,33.454815,-79.1526934,33.4554988,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.153921,33.4557221,-79.1531915,33.4563299,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.155656,33.4532377,-79.1547129,33.4537804,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]]]},"trueblue":{"epsg":26917,"ext":[-79.15741608415226,33.429120474340365,-79.13630811584773,33.45389892565963],"greens":[[-79.1430589,33.4398676,-79.1422886,33.4403795,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1406015,33.4404718,-79.1398234,33.4410556,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1404658,33.4391777,-79.139407,33.4396698,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1435606,33.4373771,-79.142877,33.4378964,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1407343,33.4351814,-79.139964,33.4358149,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.143693,33.4343648,-79.1430596,33.4349759,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1448243,33.4364147,-79.144186,33.4371573,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.147701,33.4378273,-79.1469671,33.4384971,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1489877,33.4411151,-79.1483948,33.4416625,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1510671,33.4456846,-79.1501777,33.4462354,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1515211,33.4463387,-79.1507931,33.446911,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1540586,33.4433895,-79.1533819,33.4439692,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.150595,33.4418065,-79.1498306,33.4423713,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.150348,33.4402106,-79.1495196,33.4409731,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1491583,33.4461632,-79.1484265,33.4468678,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.1496022,33.4484066,-79.1489186,33.4490218,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.144741,33.4468044,-79.1440919,33.4474065,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]],[-79.146408,33.4431266,-79.1457057,33.4439288,["USGS_LPC_SC_Georgetown_2016_LAS_2019"]]]},"rossbridge":{"epsg":26916,"ext":[-86.88993033471247,33.37988909267079,-86.86599326528751,33.400749307329214],"greens":[[-86.885471,33.3919608,-86.8848008,33.3926543,["AL_11County_2_B23","USGS_LPC_AL_JeffersonCo_2013_LAS_2015"]],[-86.8849248,33.3902884,-86.8840893,33.3908611,["AL_11County_2_B23","USGS_LPC_AL_JeffersonCo_2013_LAS_2015"]],[-86.8818534,33.3892685,-86.8810652,33.3898321,["AL_11County_2_B23","USGS_LPC_AL_JeffersonCo_2013_LAS_2015"]],[-86.8800861,33.3903671,-86.8792181,33.3909953,["AL_11County_2_B23","USGS_LPC_AL_JeffersonCo_2013_LAS_2015"]],[-86.8809148,33.3949754,-86.8800675,33.3955713,["AL_11County_2_B23","USGS_LPC_AL_JeffersonCo_2013_LAS_2015"]],[-86.8796542,33.3950116,-86.8789162,33.3957052,["AL_11County_2_B23","USGS_LPC_AL_JeffersonCo_2013_LAS_2015"]],[-86.8754551,33.3915655,-86.8747091,33.3922541,["AL_11County_2_B23","USGS_LPC_AL_JeffersonCo_2013_LAS_2015"]],[-86.8731287,33.3898854,-86.8722922,33.3905798,["AL_11County_2_B23","USGS_LPC_AL_JeffersonCo_2013_LAS_2015"]],[-86.8763584,33.3900737,-86.8755357,33.3907275,["AL_11County_2_B23","USGS_LPC_AL_JeffersonCo_2013_LAS_2015"]],[-86.8799029,33.3874917,-86.8790133,33.3879982,["AL_11County_2_B23","USGS_LPC_AL_JeffersonCo_2013_LAS_2015"]],[-86.8806351,33.388114,-86.8798508,33.3888241,["AL_11County_2_B23","USGS_LPC_AL_JeffersonCo_2013_LAS_2015"]],[-86.8840478,33.3860558,-86.8832999,33.3868097,["AL_11County_2_B23","USGS_LPC_AL_JeffersonCo_2013_LAS_2015"]],[-86.8777557,33.3875013,-86.8769005,33.3880492,["AL_11County_2_B23","USGS_LPC_AL_JeffersonCo_2013_LAS_2015"]],[-86.8781138,33.3855171,-86.8773128,33.3861105,["AL_11County_2_B23","USGS_LPC_AL_JeffersonCo_2013_LAS_2015"]],[-86.8759184,33.3865213,-86.8752167,33.3872959,["AL_11County_2_B23","USGS_LPC_AL_JeffersonCo_2013_LAS_2015"]],[-86.8702855,33.3843849,-86.8694096,33.3850453,["AL_11County_2_B23","USGS_LPC_AL_JeffersonCo_2013_LAS_2015"]],[-86.8738381,33.3873601,-86.8731768,33.3880089,["AL_11County_2_B23","USGS_LPC_AL_JeffersonCo_2013_LAS_2015"]],[-86.8767884,33.3897825,-86.8759923,33.3904611,["AL_11County_2_B23","USGS_LPC_AL_JeffersonCo_2013_LAS_2015"]]]},"senator":{"epsg":26916,"ext":[-86.4048955233529,32.44060277391741,-86.38404117664712,32.4564644260826],"greens":[[-86.3952164,32.4467797,-86.3944902,32.4474649,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.3941749,32.4454576,-86.3934847,32.4461444,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.3912507,32.4484865,-86.3903876,32.4495986,["USGS_LPC_AL_25Co_B4_2017"]],[-86.3879358,32.4515428,-86.387162,32.4521502,["USGS_LPC_AL_25Co_B4_2017"]],[-86.3943657,32.4508748,-86.3935696,32.4513855,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.3904731,32.4505948,-86.3896172,32.4513643,["USGS_LPC_AL_25Co_B4_2017"]],[-86.3961443,32.4476626,-86.3953433,32.4482146,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.3989963,32.4461118,-86.3983245,32.4468797,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.3991289,32.4500724,-86.3984104,32.450746,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.3996383,32.4471874,-86.3989685,32.447899,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.3971915,32.4502124,-86.3964429,32.4509124,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.3967725,32.4490806,-86.3958991,32.4498336,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.3930654,32.4489685,-86.3921855,32.4495123,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.396051,32.4507298,-86.3953589,32.4513521,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.3976296,32.4509644,-86.3968129,32.4515793,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.4015737,32.4486496,-86.4008037,32.4492529,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.3998413,32.4446446,-86.3989944,32.4452917,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]]]},"judge":{"epsg":26916,"ext":[-86.39772925857505,32.43164726274149,-86.37360254142493,32.4546884372585],"greens":[[-86.3922039,32.4393745,-86.3915039,32.439971,["AL_17Co_2_2020","USGS_LPC_AL_25Co_B4_2017"]],[-86.3868519,32.4362628,-86.3862804,32.4368982,["AL_17Co_2_2020","USGS_LPC_AL_25Co_B4_2017"]],[-86.3831627,32.4369861,-86.382381,32.4375569,["AL_17Co_2_2020","USGS_LPC_AL_25Co_B4_2017"]],[-86.3775229,32.4384887,-86.3768278,32.4391265,["AL_17Co_2_2020","USGS_LPC_AL_25Co_B4_2017"]],[-86.3809384,32.4384628,-86.3802034,32.4390924,["AL_17Co_2_2020","USGS_LPC_AL_25Co_B4_2017"]],[-86.3806987,32.4400387,-86.3799384,32.4407659,["AL_17Co_2_2020","USGS_LPC_AL_25Co_B4_2017"]],[-86.3806686,32.445261,-86.3798966,32.4459013,["AL_17Co_2_2020","USGS_LPC_AL_25Co_B4_2017"]],[-86.3831092,32.4428751,-86.3823226,32.4434939,["AL_17Co_2_2020","USGS_LPC_AL_25Co_B4_2017"]],[-86.3823692,32.4385066,-86.3816663,32.439151,["AL_17Co_2_2020","USGS_LPC_AL_25Co_B4_2017"]],[-86.3854052,32.4437758,-86.3846488,32.4443814,["AL_17Co_2_2020","USGS_LPC_AL_25Co_B4_2017"]],[-86.3835008,32.4472345,-86.3828446,32.4479311,["USGS_LPC_AL_25Co_B4_2017"]],[-86.385124,32.449276,-86.3843754,32.44988,["USGS_LPC_AL_25Co_B4_2017"]],[-86.3827777,32.44617,-86.3820982,32.4468152,["AL_17Co_2_2020","USGS_LPC_AL_25Co_B4_2017"]],[-86.3844747,32.4439413,-86.3838389,32.4445833,["AL_17Co_2_2020","USGS_LPC_AL_25Co_B4_2017"]],[-86.387267,32.439374,-86.3864746,32.4399639,["AL_17Co_2_2020","USGS_LPC_AL_25Co_B4_2017"]],[-86.3902835,32.4389701,-86.3896361,32.439761,["AL_17Co_2_2020","USGS_LPC_AL_25Co_B4_2017"]],[-86.3906274,32.4428481,-86.3899693,32.4435232,["USGS_LPC_AL_25Co_B4_2017"]],[-86.3932673,32.4420232,-86.3926024,32.4425196,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]]]},"legislator":{"epsg":26916,"ext":[-86.40692670515645,32.43370591247274,-86.38242499484355,32.455663787527264],"greens":[[-86.4011905,32.4436775,-86.4005051,32.4442539,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.3995897,32.4403446,-86.398918,32.4409383,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.3996123,32.4387564,-86.3988307,32.4393038,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.4033447,32.44077,-86.4025017,32.4413497,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.4036927,32.4450321,-86.4030715,32.4456779,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.4029732,32.4456909,-86.4022615,32.4464004,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.4022833,32.4433345,-86.4014888,32.4441085,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.3997947,32.4393814,-86.3991113,32.4400297,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.3953623,32.4419406,-86.3944824,32.4425161,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.3913143,32.4443352,-86.3905288,32.4448959,["USGS_LPC_AL_25Co_B4_2017"]],[-86.3900454,32.4434413,-86.3893755,32.444193,["USGS_LPC_AL_25Co_B4_2017"]],[-86.3871051,32.4464066,-86.3865033,32.4471425,["USGS_LPC_AL_25Co_B4_2017"]],[-86.3902776,32.4451842,-86.3896204,32.445849,["USGS_LPC_AL_25Co_B4_2017"]],[-86.3889693,32.4474204,-86.388143,32.4479439,["USGS_LPC_AL_25Co_B4_2017"]],[-86.3869841,32.4494896,-86.3864398,32.450152,["USGS_LPC_AL_25Co_B4_2017"]],[-86.3886401,32.4492211,-86.3878215,32.4498008,["USGS_LPC_AL_25Co_B4_2017"]],[-86.3924592,32.445979,-86.3918321,32.4466413,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]],[-86.3944098,32.4433609,-86.3936738,32.444048,["USGS_LPC_AL_25Co_B4_2017","USGS_LPC_AL_Autauga_2010_LAS_2016"]]]}}""")
OUT = 'out'; os.makedirs(OUT, exist_ok=True)
SUM = {'started': time.strftime('%Y-%m-%d %H:%M:%S'), 'dem': {}, 'greens': {}, 'ept': {}, 'errors': []}
def save_summary():
    json.dump(SUM, open(f'{OUT}/summary.json', 'w'), indent=1)
def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)
from pyproj import Transformer
IMG = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage'
EPT = 'https://s3-us-west-2.amazonaws.com/usgs-lidar-public/%s/ept.json'

def get(url, params=None, tries=5):
    for k in range(tries):
        try:
            r = requests.get(url, params=params, timeout=180)
            if r.status_code == 200: return r
            log('  http', r.status_code, r.text[:200])
        except Exception as e:
            log('  err', e)
        time.sleep(5 * (k + 1))
    raise RuntimeError('failed ' + url)

def dem(name, c):
    """1 m square-pixel DEM in the course's UTM zone, fetched in 1 km tiles and stitched."""
    E = c['epsg']; W, S, Ea, N = c['ext']
    tf = Transformer.from_crs(4326, E, always_xy=True)
    xs, ys = tf.transform([W, Ea, W, Ea], [S, S, N, N])
    x0, y0 = math.floor(min(xs)) - 10, math.floor(min(ys)) - 10
    x1, y1 = math.ceil(max(xs)) + 10, math.ceil(max(ys)) + 10
    w, h = x1 - x0, y1 - y0
    Z = np.full((h, w), np.nan, np.float32); T = 1000
    for ty in range(y0, y1, T):
        for tx in range(x0, x1, T):
            tw, th = min(T, x1 - tx), min(T, y1 - ty)
            r = get(IMG, dict(bbox=f'{tx},{ty},{tx+tw},{ty+th}', bboxSR=E, imageSR=E, size=f'{tw},{th}', format='bsq',
                               pixelType='F32', interpolation='RSP_BilinearInterpolation', f='image'))
            b = r.content
            if len(b) < tw * th * 4:
                raise RuntimeError(f'short tile {len(b)} for {tw}x{th}')
            a = np.frombuffer(b[:tw * th * 4], '<f4').reshape(th, tw).copy()
            a[(a < -1000) | (a > 10000)] = np.nan
            r0 = (y1 - (ty + th)); Z[r0:r0 + th, tx - x0:tx - x0 + tw] = a
    np.savez_compressed(f'{OUT}/dem_{name}.npz', z=Z, x0=x0, y1=y1, res=1.0, epsg=E)
    SUM['dem'][name] = dict(epsg=E, x0=x0, y0=y0, x1=x1, y1=y1, w=w, h=h, nan=int(np.isnan(Z).sum()),
                            zmin=float(np.nanmin(Z)), zmax=float(np.nanmax(Z)))
    # control points so the game side can check its own UTM maths
    lo = np.linspace(W, Ea, 5); la = np.linspace(S, N, 5); LO, LA = np.meshgrid(lo, la)
    X, Y = tf.transform(LO.ravel(), LA.ravel())
    SUM['dem'][name]['ctrl'] = [[float(a), float(b), float(c), float(d)] for a, b, c, d in zip(LO.ravel(), LA.ravel(), X, Y)]
    log(name, 'dem', w, 'x', h)

def merc(lon, lat):
    R = 6378137.0
    return R * math.radians(lon), R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))

def read_green(name, gi, res, box, epsg):
    import pdal
    W, S, E, N = box
    x0, y0 = merc(W, S); x1, y1 = merc(E, N)
    spec = [{'type': 'readers.ept', 'filename': EPT % res, 'bounds': f'([{x0:.2f},{x1:.2f}],[{y0:.2f},{y1:.2f}])', 'threads': 6}]
    t = time.time()
    p = pdal.Pipeline(json.dumps(spec)); n = p.execute()
    arrs = p.arrays; a = arrs[0] if arrs else None
    info = dict(n=int(n), sec=round(time.time() - t, 1))
    if a is None or len(a) == 0:
        return name, gi, res, info, None
    cls = a['Classification'].astype(int)
    info['classes'] = {int(k): int(v) for k, v in zip(*np.unique(cls, return_counts=True))}
    g = a[cls == 2]
    if len(g) == 0:
        return name, gi, res, info, None
    tf = Transformer.from_crs(3857, epsg, always_xy=True)
    X, Y = tf.transform(g['X'], g['Y'])
    X = np.asarray(X); Y = np.asarray(Y)
    ox, oy = math.floor(X.min()), math.floor(Y.min())
    d = dict(ox=ox, oy=oy, x=np.round((X - ox) * 100).astype(np.int32), y=np.round((Y - oy) * 100).astype(np.int32),
             z=np.round(np.asarray(g['Z']) * 1000).astype(np.int32))
    for k in ('ReturnNumber', 'NumberOfReturns'):
        if k in g.dtype.names: d[k] = g[k].astype(np.uint8)
    if 'GpsTime' in g.dtype.names and len(g): info['gps'] = [float(g['GpsTime'].min()), float(g['GpsTime'].max())]
    area = (X.max() - X.min()) * (Y.max() - Y.min())
    info['ground'] = int(len(g)); info['gdens'] = round(len(g) / max(area, 1), 2)
    return name, gi, res, info, d

def main():
    only = sys.argv[1:]
    for name, c in CFG.items():
        if only and name not in only: continue
        try: dem(name, c)
        except Exception as e:
            SUM['errors'].append(f'dem {name}: {e}'); log('DEM FAIL', name, e); traceback.print_exc()
        save_summary()
    for res in sorted({r for c in CFG.values() for g in c['greens'] for r in g[4]}):
        try: SUM['ept'][res] = get(EPT % res).json()
        except Exception as e: SUM['errors'].append(f'ept {res}: {e}')
    save_summary()
    for name, c in CFG.items():
        if only and name not in only: continue
        jobs = [(name, gi, r, g[:4], c['epsg']) for gi, g in enumerate(c['greens']) for r in g[4]]
        pack = {}; SUM['greens'][name] = {}
        with ProcessPoolExecutor(6) as ex:
            fs = [ex.submit(read_green, *j) for j in jobs]
            for f in as_completed(fs):
                try:
                    nm, gi, r, info, d = f.result()
                except Exception as e:
                    SUM['errors'].append(f'{name}: {e}'); log('READ FAIL', name, e); continue
                SUM['greens'][name].setdefault(str(gi), {})[r] = info
                log(name, gi, r, info.get('ground'), 'ground', info.get('gdens'), '/m2', info['sec'], 's')
                if d is not None:
                    for k, v in d.items(): pack[f'g{gi}|{r}|{k}'] = np.asarray(v)
        np.savez_compressed(f'{OUT}/pts_{name}.npz', **pack)
        log(name, 'saved', os.path.getsize(f'{OUT}/pts_{name}.npz') // 1024, 'KB')
        save_summary()
    SUM['finished'] = time.strftime('%Y-%m-%d %H:%M:%S'); save_summary()

if __name__ == '__main__':
    main()
