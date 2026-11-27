#!/bin/bash
# every Unity exporter for one course: export_all.sh <course id> [site]
# (Troy Burne ships in the app: Resources/troy; every other course is downloaded: Assets/Courses/<id>, with its picture and tips in Resources/<id>)
# (here: CHROME_PATH=/usr/bin/google-chrome PLAYWRIGHT_CORE=/opt/node-tools/node_modules/playwright-core)
set -e
CID=$1; SITE=${2:-$(cd "$(dirname "$0")/../../.." && pwd)}; R=$(dirname "$0"); RES=$SITE/unity/Assets/Resources; if [ "$CID" = troy ]; then OUT=$RES/$CID; else OUT=$SITE/unity/Assets/Courses/$CID; fi
export GGTREES=$RES/trees; mkdir -p "$RES/$CID"
mkdir -p "$OUT"; export GGCOURSE=$CID
# (FROM=<step> starts later: course look slope trees far built flag tips)
on=${FROM:-course}; go() { [ "$on" = "$1" ] && on=all; [ "$on" = all ]; }
go course && node $R/export_course.js "$SITE" "$OUT" $CID
go look && node $R/export_look.js "$SITE" "$OUT" $CID
go slope && node $R/export_slope.js "$SITE" "$OUT" $CID
go trees && node $R/export_trees.js "$SITE" "$OUT" $CID
go far && node $R/export_far.js "$SITE" "$OUT" $CID
go built && node $R/export_built.js "$SITE" "$OUT" $CID
go flag && node $R/export_flag.js "$SITE" "$OUT/flag.png" $CID
go tips && node $R/export_tips.js "$SITE" "$RES/$CID/tips.json" $CID
echo "done $CID: $(du -sh "$OUT" | cut -f1)"
