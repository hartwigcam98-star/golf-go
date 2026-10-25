set -e
cd /home/claude/golf/trace && rm -rf /home/claude/golf/run_jacks_t && python3 gen.py | tail -1
cp /home/claude/golf/run_jacks_g/{summary.json,pts_jacks.npz,dem_jacks.npz,demll_jacks.npz,lidar_jacks.json} /home/claude/golf/run_jacks_t/
cd /home/claude/golf/auto/jacks && python3 ../build_course.py jacks ../../run_jacks_t > /tmp/bc.log 2>&1 || { tail /tmp/bc.log; exit 1; }
cd /home/claude/golf && python3 auto/setup_lidar.py jacks run_jacks_t | tail -1
python3 lidar2/build_patches2.py jacks | tail -1
python3 sc3/soften.py jacks 3.4 3.2 | tail -1
