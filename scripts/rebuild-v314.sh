#!/usr/bin/env bash
set -euo pipefail
cat v310-part-00.txt v310-part-01.txt v310-part-02.txt v310-part-03.txt | base64 -d > v310-source.zip
unzip -t v310-source.zip
rm -rf project
mkdir project
unzip -q v310-source.zip -d project
python - <<'PY'
from pathlib import Path
p = Path('project/app/src/main/java/kr/ac/library/inventory/MainActivity.java')
s = p.read_text(encoding='utf-8')
replacements = [
    ('import android.app.Activity;\n', 'import android.annotation.SuppressLint;\nimport android.app.Activity;\n'),
    ('import android.graphics.drawable.GradientDrawable;\n', 'import android.graphics.Typeface;\nimport android.graphics.drawable.GradientDrawable;\n'),
    ('import android.provider.Settings;\n', ''),
    ('public class MainActivity extends Activity {', '@SuppressLint("SetTextI18n")\npublic class MainActivity extends Activity {'),
    ('    private static final String PREF_LAST_LCHECK_EXPORT_AT = "last_lcheck_export_at";\n', '    private static final String PREF_LAST_LCHECK_EXPORT_AT = "last_lcheck_export_at";\n    private static final String PREF_DEVICE_ID = "local_device_id";\n'),
    ('        deviceId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);\n        if (deviceId == null || deviceId.isEmpty()) deviceId = "android-device";', '        deviceId = preferences.getString(PREF_DEVICE_ID, "");\n        if (deviceId == null || deviceId.isEmpty()) {\n            deviceId = UUID.randomUUID().toString();\n            preferences.edit().putString(PREF_DEVICE_ID, deviceId).apply();\n        }'),
    ('if(android.os.Build.VERSION.SDK_INT>=21)scanInput.setShowSoftInputOnFocus(false);', 'scanInput.setShowSoftInputOnFocus(false);'),
    ('runOnUiThread(()->{if(!destroyed&&!(Build.VERSION.SDK_INT>=17&&isDestroyed()))action.run();});', 'runOnUiThread(()->{if(!destroyed&&!isDestroyed())action.run();});'),
    ('if(android.os.Build.VERSION.SDK_INT>=21)x.setElevation(dp(1));', 'x.setElevation(dp(1));'),
    ('if(bold)t.setTypeface(null,1);', 'if(bold)t.setTypeface(null,Typeface.BOLD);'),
]
for old, new in replacements:
    if old not in s: raise SystemExit('Expected v3.10 fragment not found: ' + old[:80])
    s = s.replace(old, new)
p.write_text(s, encoding='utf-8')
PY
cat v311fix-0.txt v311fix-1.txt v311fix-2.txt v311fix-3.txt | base64 -d | gzip -d > v311.patch
(cd project && patch -p1 < ../v311.patch)
python - <<'PY'
from pathlib import Path
p=Path('project/app/src/main/java/kr/ac/library/inventory/MainActivity.java')
s=p.read_text(encoding='utf-8')
if 'private View space(int heightDp)' not in s:
    anchor='    private TextView label(String s){TextView t=text(s,13,true);t.setPadding(0,dp(8),0,dp(3));return t;}\n'
    if anchor not in s: raise SystemExit('space insertion anchor missing')
    s=s.replace(anchor,anchor+'    private View space(int heightDp){View v=new View(this);v.setLayoutParams(new LinearLayout.LayoutParams(1,dp(heightDp)));return v;}\n',1)
old='    private void submitEditText(){handler.removeCallbacks(idleCommit);if(scanInput==null)return;String raw=hardwareBuffer.length()>0?hardwareBuffer.toString():scanInput.getText().toString();hardwareBuffer.setLength(0);lastHardwareKeyAt=0;scanInput.setText("");processScanPayload(raw);}'
new='''    private void submitEditText(){
        handler.removeCallbacks(idleCommit);if(scanInput==null)return;
        boolean fromHardware=hardwareBuffer.length()>0;
        String raw=fromHardware?hardwareBuffer.toString():scanInput.getText().toString();
        hardwareBuffer.setLength(0);lastHardwareKeyAt=0;scanInput.setText("");
        if(raw==null||raw.trim().isEmpty()){focusScanner();return;}
        if(fromHardware){processScanPayload(raw);return;}
        String reg=BarcodeNormalizer.normalize(raw);
        if(reg.isEmpty()){message("직접 입력 확인","유효한 등록번호를 입력하세요.");return;}
        reviewManualInput(raw,reg);
    }'''
if old in s: s=s.replace(old,new,1)
elif 'boolean fromHardware=hardwareBuffer.length()>0;' not in s: raise SystemExit('submitEditText normalization failed')
repls=[
('스캐너 입력은 자동 판정합니다. 직접 입력은 오타 방지를 위해 등록 전 확인하며, 짧거나 의심스러운 번호는 확인 필요로 보류합니다.','스캐너 입력은 자동 판정합니다. 버튼·붙여넣기·직접 입력은 사람 입력으로 검토하며, 짧거나 의심스러운 번호는 확인 필요로 보류합니다.'),
('TextView recentTitle=text("최근 스캔",15,true);','TextView recentTitle=text("최근 스캔 · 항목을 누르면 수정·삭제·이동",15,true);'),
('기록 탭 전체 스크롤, 점검 카드 관리, 내보내기 이력 표시는 v3.10.0 이상에서 지원합니다.','직접 입력 재확인과 점검 기록 수정·삭제 기능은 v3.11.0 이상에서 지원합니다.')]
for old,new in repls:
    if old in s: s=s.replace(old,new,1)
    elif new not in s: raise SystemExit('UI normalization failed')
p.write_text(s,encoding='utf-8')
PY
cat v312p-00.txt v312p-01.txt v312p-02.txt v312p-03.txt | base64 -d | gzip -d > v312.patch
(cd project && patch -p2 --batch < ../v312.patch || true)
if find project/app -name '*.rej' | grep -q .; then find project/app -name '*.rej' -print -exec cat {} \;; exit 1; fi
find project -name '*.rej' -delete
base64 -d v313.patch.gz.b64 | gzip -d > v313.patch
(cd project && patch -p1 --batch < ../v313.patch || true)
if find project/app -name '*.rej' | grep -q .; then find project/app -name '*.rej' -print -exec cat {} \;; exit 1; fi
find project -name '*.rej' -delete
cat v314p-00.txt v314p-01.txt v314p-02.txt v314p-03.txt v314p-04.txt | base64 -d | gzip -d > v314.patch
(cd project && patch -p1 --batch < ../v314.patch)
(cd project && patch -p1 --batch < ../v314-final-fix.patch)
grep -q "versionName '3.14.0'" project/app/build.gradle
grep -q 'showActionDialog(session.name' project/app/src/main/java/kr/ac/library/inventory/MainActivity.java
grep -q 'moveShelves(long sessionId' project/app/src/main/java/kr/ac/library/inventory/DbHelper.java
