# Verification record

ตรวจในเครื่องพัฒนาวันที่ **21 ตุลาคม 2026 (Asia/Bangkok)** บน Node.js 24.22.0 ใช้ PostgreSQL/PostGIS, Valkey และ MinIO ใน Docker จริง ชุดทดสอบใช้ฐานข้อมูลแยกจากข้อมูลแอป

| การตรวจ                                          | ผล                                                   |
| ------------------------------------------------ | ---------------------------------------------------- |
| TypeScript strict (`npm run typecheck`)          | ผ่าน                                                 |
| ESLint (`npm run lint`)                          | ผ่าน                                                 |
| Unit + integration (`npm run test:integration`)  | ผ่าน 17 เคส                                          |
| Chromium (`LIVE_MAP_TEST=true npm run test:e2e`) | ผ่าน 2 สถานการณ์                                     |
| Production build (`npm run build`)               | ผ่าน                                                 |
| Docker build / runtime health                    | build สำเร็จ และ `/api/health` ตอบ 200               |
| Production dependency audit                      | ไม่พบ advisory จาก `npm audit --omit=dev` ณ เวลาตรวจ |

GitHub Actions รันจาก clean runner และผ่านทั้งหมดแล้ว: [CI run](https://github.com/hereismeaw/paranormal-map/actions/runs/39555255133) รวม npm ci, typecheck, lint, MinIO integration, Chromium, production build และ production audit

Bootstrap CLI ถูกทดสอบผ่าน stdin กับฐานข้อมูลทดสอบแยกด้วย ไม่ได้สร้างบัญชีที่มีรหัสเริ่มต้นไว้ในแอปจริง

## สิ่งที่ทดสอบจริง

- ผู้เยี่ยมชมวางหมุด กรอกชื่อเล่น ส่งเรื่องโดยไม่ล็อกอิน และเปิดลิงก์เรื่องที่เพิ่งเผยแพร่ได้ทันที
- public map, search, detail และ stats เห็นการเปลี่ยนแปลงหลัง commit โดยไม่เรียกแอดมิน
- Better Auth ล็อกอินผู้ดูแลได้ ป้องกัน admin endpoints จากผู้เยี่ยมชม และปิด public sign-up
- แอดมินลบรายงานแล้ว public queries ไม่คืนข้อมูล หน้ารายละเอียด API เป็น 404 จากนั้นกู้คืนได้
- อีกแท็บที่เปิดแผนที่ค้างไว้เอาหมุดที่เลือก รายการ และ preview ออกหลังรอบ refresh ไม่ทิ้งหมุด DOM เก่าบนแผนที่
- concurrent idempotency ได้รายงานเดียว และ atomic rate limit ไม่ปล่อยเกินเพดาน
- ปฏิเสธ invalid, expired, wrong-host, wrong-action และ replayed verification tokens
- honeypot, markup โจมตี, reserved nicknames, Unicode controls, พิกัดผิด และรายงานซ้ำถูกตรวจฝั่ง server
- พิกัดอ่อนไหวถูกปัดก่อนบันทึก และการลบเรื่องหนึ่งไม่ลบอีกเรื่องในพิกัดเดียวกัน
- หลักฐานภาพเข้า MinIO quarantine จริง เปิดอ่านไม่ได้ก่อนประมวลผล จากนั้น re-encode เป็น WebP และล้าง EXIF ได้
- การลบรายงานปิด public media แต่ผู้ดูแลยังตรวจไฟล์ที่ผ่านการประมวลผลผ่าน protected endpoint ได้
- ตรวจ map worker ที่ให้บริการจากแอปเอง และตรวจจำนวน symbol/cluster ที่ MapLibre render จริง
- smoke test แยกเรียก OpenFreeMap จริง พร้อม 20 เรื่องสมมติที่ติดป้ายชัดเจน
- viewport มือถือ 390 × 844 ไม่มี horizontal overflow และชื่อเล่นที่จำไว้ล้างได้

## ขอบเขตของผลตรวจ

Integration tests mock **เฉพาะคำตอบ HTTP ของ Cloudflare Siteverify** เพื่อทดสอบกรณีปฏิเสธต่าง ๆ อย่างทำซ้ำได้ ฐานข้อมูล, PostGIS, rate limiter และ image storage ไม่ได้ mock

Browser workflow ใช้ fixture ของ Turnstile widget และพื้นแผนที่ แต่ server ยังเรียก Siteverify ของ Cloudflare จริงด้วย official development key ส่วน smoke test แผนที่จริงไม่ใช้ tile fixture และเปิดด้วย `LIVE_MAP_TEST=true` เท่านั้น เพื่อลดความล้มเหลวของ CI จากผู้ให้บริการภายนอก

ยังไม่ได้ทำ load test, penetration test หรือทดสอบ Cloudflare Tunnel กับโดเมน production ของผู้ใช้ ไม่ได้ทดสอบ ClamAV ด้วย signature database จริงในรอบนี้ ไฟล์เสียง/วิดีโอต้องมี scanner ที่ตอบผลสำเร็จจึงจะเปิดเผยได้ หาก scanner/storage ล่ม worker จะเก็บไฟล์ private ไว้รอลองใหม่

ค่า Turnstile ที่ใช้ในเครื่องนี้เป็น test credentials ซึ่ง production ปฏิเสธ ต้องกำหนด real site key, secret, hostname, HTTPS และ bootstrap ผู้ดูแลก่อนเปิดรับรายงานจริง ไม่มี production secret หรือรหัส sudo อยู่ใน repository

## Development tooling advisory

Full `npm audit` รายงาน high advisory ในสาย dependency ของ ESLint/Next lint tooling จำนวน 5 package entries ซึ่งเชื่อมโยงกับ `braces` และตัวเรียกใช้ ไม่มี patched version ที่ registry เสนอในชุดที่ใช้นี้ ข้อเสนออัตโนมัติเป็นการ downgrade Next lint config ข้าม major ไป 14.x จึงไม่ได้ใช้ `npm audit fix --force` เพื่อซ่อนผลตรวจ

Production audit แยกแล้วเป็นศูนย์ ณ วันที่ตรวจ ส่วน tooling advisory ยังเป็นข้อจำกัดที่ต้องติดตาม การตรวจ dependency ของ npm ไม่ครอบคลุม OS packages, container images หรือยืนยันว่าซอฟต์แวร์ไม่มีช่องโหว่อื่น

ไฟล์ screenshot ใน `docs/screenshots/` เป็นผลจากการทดสอบบนข้อมูลสมมติ ไม่ใช่หลักฐานการมีอยู่ของสิ่งเหนือธรรมชาติครับ
