<div align="center">

# PARANORMAL ACTIVITY

**Every Place Has a Story.**

แผนที่เรื่องลี้ลับจากชุมชน — เล่าได้โดยไม่ต้องสมัคร และไม่ต้องรอแอดมินตื่นมาอนุมัติ

[![CI](https://github.com/hereismeaw/paranormal-map/actions/workflows/ci.yml/badge.svg)](https://github.com/hereismeaw/paranormal-map/actions/workflows/ci.yml)

</div>

## ทำไมถึงมีโปรเจกต์นี้

ผมเป็นคนกลัวผีครับ

กลัวระดับที่ปิดไฟแล้วต้องรีบเดินกลับเตียง แต่ก็ยังอยากรู้ว่าแถวบ้านมีเรื่องเล่าอะไรบ้าง ซึ่งฟังดูย้อนแย้งอยู่เหมือนกัน ปกติคนกลัวผีน่าจะหลีกเลี่ยงข้อมูลพวกนี้ ส่วนผมเลือกทำแผนที่รวบรวมมันไว้ จะได้รู้ว่าควรกลัวตรงไหนเป็นพิเศษ

เวลาเจอเรื่องหลอนบนอินเทอร์เน็ต ปัญหาคือจำเรื่องได้ แต่จำพิกัดไม่ได้ สุดท้ายก็กลัวทั้งจังหวัด ผมเลยอยากมีพื้นที่ที่คนเล่าเรื่องของตัวเอง ปักหมุด เลือกชื่อเล่น แล้วแบ่งปันได้เลย ไม่ต้องสมัครสมาชิกเพื่อเล่าว่าเมื่อคืนเจออะไรมา คนเพิ่งเจอผีมาอาจไม่พร้อมคิดรหัสผ่านที่มีตัวพิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ

นี่เลยกลายเป็น **Paranormal Activity** ครับ ทำเว็บโทนมืดให้ดูเหมือนโต๊ะทำงานนักสืบ แต่คนเขียนอาจเปิดไฟทุกดวงตอนนั่งทำอยู่

เว็บนี้เก็บ **เรื่องเล่าจากผู้คน** ไม่ได้ยืนยันว่ามีผีจริง และหน้า “เรื่องผีรอบๆ ตัวคุณ” ก็แค่ดึงรายงานใกล้พิกัดจากฐานข้อมูล ไม่ได้ใช้ Wi-Fi สแกนวิญญาณ ถ้ามันทำได้จริงผมน่าจะเป็นคนแรกที่ถอนการติดตั้ง

## แอปทำอะไรได้

- เปิดแผนที่ประเทศไทย มีหมุด SVG แยก 15 ประเภท รวมกลุ่มเมื่อซูมออก และดูความหนาแน่นของรายงานได้
- ส่งเรื่องแบบผู้เยี่ยมชม เลือกพิกัดในไทยด้วยแผนที่ ลากหมุด กรอก GPS หรือขอใช้ตำแหน่งปัจจุบัน ระบบเติมจังหวัดและอำเภอ/เขตให้อัตโนมัติแล้วยังแก้ได้ ไม่มีหน้าสมัครบัญชีคั่น
- ใส่ชื่อเล่นได้ทั้งไทยและอังกฤษ หรือเว้นว่างเป็น “ผู้พบเห็นนิรนาม” จำชื่อในเครื่องได้ และล้างออกได้
- เผยแพร่ข้อความทันทีเมื่อผ่าน validation, Turnstile และระบบป้องกันสแปม จากนั้นจึงแนบหลักฐานเพิ่มเติมได้
- ค้นหาจากชื่อเรื่อง เนื้อหา ชื่อเล่น จังหวัด อำเภอ ประเภท วันที่ และระยะทาง พร้อมแบ่งหน้า
- เปิดเรื่องเล่าแบบลิงก์ถาวร แชร์ คัดลอกพิกัด อ่านเรื่องใกล้เคียง หรือเพิ่มประสบการณ์ในพิกัดเดิมได้
- ผู้ดูแลล็อกอินเพื่อซ่อน ลบแบบ soft delete กู้คืน ดูการแจ้งเนื้อหา สัญญาณสแปม สถิติ ตั้งค่าเพดาน และอ่าน audit log
- ทุกสถิติมาจาก PostgreSQL ไม่มีตัวเลขผู้ใช้งานหรือเรื่องจริงที่แต่งขึ้นมาเติมหน้าแรก

ภาษาไทยเป็นหลัก ปุ่ม EN แปล navigation, hero, ตัวกรองแผนที่ และชื่อประเภท ส่วนข้อความยาว แบบฟอร์ม และระบบผู้ดูแลบางส่วนยังเป็นภาษาไทย ดูขอบเขตเพิ่มเติมใน [Implementation notes](docs/IMPLEMENTATION.md)

## หน้าตาของเว็บ

![แผนที่ Paranormal Activity](docs/screenshots/map.png)

ภาพจาก browser smoke test ที่ใช้ vector tiles จริง มีข้อมูลสมมติ 20 เรื่องที่ติดป้ายชัดเจน และเรื่องสำหรับทดสอบ workflow อีกหนึ่งเรื่อง ไม่ใช่สถิติหรือรายงานจริงจากผู้ใช้

![หน้าแรก Paranormal Activity](docs/screenshots/home.png)

## เส้นทางการเผยแพร่

```text
ผู้เยี่ยมชม → ตรวจข้อมูลและความปลอดภัย → บันทึก published → เห็นบนแผนที่
                                                          ↓
                                          แจ้งเนื้อหา / ผู้ดูแลจัดการภายหลัง
```

ไม่มี `pending_approval` และไม่มีปุ่มอนุมัติเรื่องใหม่ ผู้ดูแลไม่ได้เป็นเงื่อนไขของการเผยแพร่

สถานะในฐานข้อมูลใช้ `published`, `rejected_auto`, `hidden`, `hidden_auto`, `deleted` โดยการปฏิเสธก่อนสร้างรายงานจะบันทึกเป็น spam event แบบลดข้อมูลส่วนตัว แทนการเก็บข้อความอันตรายทั้งก้อน สถานะ `rejected_auto` เผื่อไว้สำหรับกระบวนการอัตโนมัติในอนาคต

Public API, search, detail, stats และการอ่านไฟล์ตรวจสถานะทุกครั้งและส่ง `Cache-Control: no-store` ผู้ส่งเปิดพิกัดใหม่ได้ทันที แผนที่ที่คนอื่นเปิดค้างอยู่จะดึงข้อมูลใหม่ทุก 10 วินาทีและเมื่อกลับมาโฟกัสหน้า ไม่ใช่ระบบ push ผ่าน WebSocket

หนึ่งพิกัดมีหลายเรื่องเล่าได้ การลบเรื่องหนึ่งไม่ลบเรื่องอื่นที่ใช้สถานที่เดียวกัน

## Stack ที่ใช้

รุ่นถูกตรวจจาก npm registry และเอกสารผู้พัฒนาตอนเริ่มงาน แล้วล็อกด้วย `package-lock.json` ไม่ใช้ beta/canary

| ส่วน        | เครื่องมือ                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| เว็บและ API | Next.js 16.4.2, React 19.3.1, Node.js 24.22.0 LTS                                                             |
| UI          | TypeScript strict, Tailwind CSS 4.3.3, Lucide, Sonner, React Hook Form                                        |
| แผนที่      | MapLibre GL JS 6.15.0, GeoJSON, vector tiles, SVG symbols                                                     |
| ฐานข้อมูล   | PostgreSQL 18 + PostGIS 3.6, pg_trgm, Drizzle สำหรับ Better Auth และ parameterized SQL สำหรับ spatial queries |
| ผู้ดูแล     | Better Auth 1.7.11, ปิด public sign-up, ตรวจ role จากฐานข้อมูล                                                |
| ป้องกันสแปม | Cloudflare Turnstile Siteverify, Valkey, honeypot, fingerprint/similarity, idempotency                        |
| หลักฐาน     | S3-compatible storage, MinIO ในเครื่อง, R2 ใน production, Sharp, ClamAV สำหรับเสียง/วิดีโอ                    |
| ทดสอบ       | Vitest, Playwright/Chromium, ESLint, Prettier                                                                 |

TypeScript 6 และ ESLint 9 ถูกเลือกให้เข้ากับ peer dependencies ของชุด Next/ESLint ที่ใช้ใน lockfile แทนการฝืนติดตั้ง compiler/linter รุ่นที่ plugin ยังไม่รองรับ

แผนที่เริ่มต้นใช้ style ที่เขียนเองใน `public/map-style.json` กับ [OpenFreeMap](https://openfreemap.org/quick_start/) คง attribution ของ OpenStreetMap/OpenMapTiles ไว้ ไม่ดึง tile จากเซิร์ฟเวอร์สาธารณะ `tile.openstreetmap.org` โดยตรง เปลี่ยนเป็นผู้ให้บริการที่คุณมีสิทธิ์ใช้ได้ด้วย `NEXT_PUBLIC_MAP_STYLE_URL` และแก้ CSP ให้ตรงโดเมนด้วย

ขอบเขตประเทศใช้ [geoBoundaries](https://www.geoboundaries.org/) THA ADM0 แบบ simplified (CC BY 4.0) เพื่อจำกัดการปักหมุดให้อยู่ในไทย การเติมจังหวัดและอำเภอใช้ [Nominatim](https://operations.osmfoundation.org/policies/nominatim/) ของ OpenStreetMap ส่งแค่พิกัดที่ปัดแล้ว ไม่ส่งชื่อหรือคุกกี้ผู้เยี่ยมชม

## เริ่มด้วย Docker

ต้องมี Docker Engine และ Compose v2

```bash
git clone https://github.com/hereismeaw/paranormal-map.git
cd paranormal-map
cp .env.example .env
```

แก้ `.env` ก่อนเปิดใช้งานจริง โดยเฉพาะรหัสฐานข้อมูล/storage และ `BETTER_AUTH_SECRET` สร้าง secret ได้ด้วย:

```bash
openssl rand -hex 32
```

ตั้งค่า `NEXT_PUBLIC_APP_URL` และ `BETTER_AUTH_URL` ให้เป็น URL เดียวกัน เช่น `https://ghost.example.com` อย่าใช้รหัสผู้ดูแลเหมือนรหัส sudo หรือรหัส storage

Turnstile ต้องใช้ site key/secret key จริงสำหรับ production พร้อมตั้ง hostname ให้ตรงโดเมน หากไม่มี key หรือยืนยันไม่ได้ ระบบจะไม่รับรายงาน ไม่มี fallback ปิด captcha ให้เอง

```bash
docker compose up -d --build
```

เปิด `http://localhost:3000` หรือส่งผ่าน HTTPS reverse proxy/Cloudflare Tunnel แอปใน production ตั้ง cookie เป็น Secure จึงต้องใช้ HTTPS เพื่อส่งเรื่องและล็อกอินได้ครบ ส่วน local development แบบ HTTP ใช้ขั้นตอนด้านล่าง

บริการที่เปิดขึ้นมา:

- `app`: Next.js แบบ standalone, ทำงานด้วย user ที่ไม่ใช่ root
- `postgres`: เก็บฐานข้อมูลและ PostGIS ใน persistent volume
- `valkey`: เก็บ rate limit และ replay keys แบบใช้ร่วมกันระหว่าง instance
- `minio`: private object storage สำหรับหลักฐาน
- `migrate`: รัน migration ก่อนแอปรับงาน
- `media-worker`: แปลงภาพและตรวจไฟล์นอกเส้นทางการเผยแพร่ข้อความ

PostgreSQL, Valkey และ MinIO ไม่เปิดพอร์ตออกสู่ภายนอกใน compose หลัก ส่วนเว็บ bind ที่ `127.0.0.1:3000` เท่านั้น

MinIO image ดั้งเดิมบาง tag ไม่สามารถดึงได้แล้ว ชุดนี้จึงใช้ build จาก [coollabsio/minio](https://github.com/coollabsio/minio) ที่ระบุ release และ pin digest ไว้ ตรวจ image และนโยบายการอัปเดตให้เหมาะกับระบบของคุณ หรือใช้ R2/S3 สำหรับ production ได้เลย

### สร้างผู้ดูแลครั้งแรก

ไม่มีหน้า public registration ตั้งอีเมลใน `ADMIN_BOOTSTRAP_EMAIL` แล้วส่งรหัสผ่านผ่าน stdin:

```bash
read -rs -p 'Admin password (at least 12 characters): ' admin_password
echo
printf '%s' "$admin_password" | docker compose run --rm -T migrate npm run admin:create
unset admin_password
```

คำสั่งเก็บเฉพาะ hash ใน auth account ไม่มี password อยู่ใน source code, command-line arguments หรือ committed `.env` เมื่อเสร็จให้เปิด `/admin/login`

### เปิดสแกนเสียงและวิดีโอ

```bash
docker compose --profile media-scanner up -d clamav media-worker
```

ClamAV ต้องโหลด signature และใช้ RAM เพิ่ม ถ้า scanner ไม่พร้อม ไฟล์เสียง/วิดีโอจะยังอยู่ใน private queue ไม่ถูกเปิดเผยออกมา ภาพถูกตรวจ signature จำกัด pixel หมุน/ย่อ แปลงเป็น WebP และตัด EXIF ก่อนแสดงได้ รายละเอียดใน [media pipeline](docs/IMPLEMENTATION.md#media)

### ใช้ Cloudflare R2

ตั้ง `S3_ENDPOINT` เป็น endpoint ของบัญชี R2, `S3_REGION=auto`, ชื่อ bucket และ credentials ที่มีสิทธิ์เฉพาะ bucket นั้น สร้าง bucket แบบ private ไว้ก่อน ไม่มี public bucket policy หรือ public custom domain สำหรับหลักฐาน แอปเป็นผู้ตรวจสถานะก่อนส่งไฟล์ทุกครั้ง

ปิดบริการ MinIO ได้หากใช้ R2 ทั้งระบบ แต่เก็บ `media-worker` ไว้ ต้อง rebuild เมื่อเปลี่ยนตัวแปร `NEXT_PUBLIC_*` เพราะ Next.js ฝังค่าใน browser bundle ตอน build

## พัฒนาในเครื่อง

ติดตั้ง Node.js 24 LTS แล้วใช้ lockfile:

```bash
npm ci
cp .env.example .env
```

ใน `.env` สำหรับ local Node ให้แก้ hostname ของบริการเป็น loopback:

```dotenv
DATABASE_URL=postgres://paranormal:YOUR_DATABASE_PASSWORD@127.0.0.1:5432/paranormal
REDIS_URL=redis://127.0.0.1:6379
S3_ENDPOINT=http://127.0.0.1:9000
NEXT_PUBLIC_APP_URL=http://localhost:3000
BETTER_AUTH_URL=http://localhost:3000
```

ใช้ [Cloudflare test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) เฉพาะ development:

```dotenv
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
TURNSTILE_HOSTNAME=
TURNSTILE_CHECK_ACTION=false
```

test secret ยังถูกส่งไปตรวจที่ Siteverify จริง แต่ตัวอย่างคำตอบของ Cloudflare ไม่ใช้ hostname/action ของ production จึงเว้น hostname และปิดการเช็ก action ใน development เท่านั้น **Production ปฏิเสธ test secret เหล่านี้** การป้องกัน replay ฝั่ง Cloudflare ใช้จริงตามปกติ ส่วน supplemental Redis replay key ข้ามเฉพาะ official always-pass development secret ซึ่งใช้ dummy token เดิมซ้ำได้

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d postgres valkey minio
npm run db:migrate
npm run dev
```

อีก terminal รัน worker:

```bash
npm run media:worker
```

แล้วเปิด `http://localhost:3000` compose.dev เปิดเฉพาะ `127.0.0.1:5432`, `6379`, `9000` เพื่อให้ Node บนเครื่องเข้าถึงได้ ไม่ควรนำ override นี้ไปเปิดพอร์ตฐานข้อมูลแบบ public

### ข้อมูลสาธิต

```bash
npm run db:seed
```

เพิ่ม 20 เรื่องสมมติรอบประเทศไทย ครอบคลุมกรุงเทพฯ เชียงใหม่ เชียงราย อยุธยา กาญจนบุรี ภูเก็ต ชลบุรี สงขลา พัทลุง ตรัง และนครศรีธรรมราช ทุก record มี `fictional=true` และป้าย “เรื่องสมมติ” ทั้งในชื่อเรื่องและ UI รันซ้ำไม่เพิ่มข้อมูลซ้ำ ไม่มีการ seed อัตโนมัติเมื่อ deploy

ใน production คำสั่ง seed ปิดไว้ หากจงใจทำเว็บ demo ต้องเปิด `ALLOW_DEMO_SEED=true` เอง ห้ามเปลี่ยนเรื่องสาธิตให้ดูเหมือนรายงานจริง

## API โดยย่อ

| Public                                    | หน้าที่                                                       |
| ----------------------------------------- | ------------------------------------------------------------- |
| `GET /api/guest`                          | เริ่ม signed guest cookie แบบ HttpOnly                        |
| `GET /api/locations`                      | รายงานที่ published เท่านั้น ใช้เติมแผนที่                    |
| `POST /api/locations` หรือ `/api/reports` | ตรวจและเผยแพร่รายงาน ไม่มี user login                         |
| `GET /api/reports/:id`                    | เนื้อหาและหลักฐานที่ผ่านการตรวจ                               |
| `GET /api/locations/nearby`               | proximity query ด้วย PostGIS                                  |
| `GET /api/search`                         | ค้นหาคลังเรื่องเล่าชุมชน                                      |
| `GET /api/stats`                          | สถิติสาธารณะจากฐานข้อมูล                                      |
| `POST /api/abuse-reports`                 | แจ้งเนื้อหา ตรวจ Turnstile และจำกัดความถี่                    |
| `POST /api/media?reportId=...`            | ส่ง raw file พร้อม `X-Turnstile-Token` จากเซสชันเจ้าของรายงาน |
| `GET /api/media/:id`                      | ส่งเฉพาะไฟล์ ready ที่รายงานยัง published                     |
| `GET /api/health`                         | ตรวจ PostgreSQL และ Valkey                                    |

`GET /api/locations` รับ `q`, `category`, `province`, `nickname`, `since`, `lat`, `lng`, `radius` (เมตร สูงสุด 50,000), `bbox=west,south,east,north`, `page`, `limit` (สูงสุด 500) ใช้ longitude/latitude ตาม WGS84 ระยะทางแสดงเป็นเมตร ผลเรียงใหม่สุด หรือใกล้สุดถ้าระบุจุดค้นหา

| Admin เท่านั้น                        | หน้าที่                                          |
| ------------------------------------- | ------------------------------------------------ |
| `GET /api/admin/reports`              | ค้นหาและกรองทุกสถานะ                             |
| `GET /api/admin/reports/:id`          | ตรวจเรื่องและสถานะหลักฐาน รวมรายงานที่ซ่อนหรือลบ |
| `GET /api/admin/media/:id`            | เปิดไฟล์ ready โดยตรวจสิทธิ์ผู้ดูแลทุกครั้ง      |
| `PATCH /api/admin/reports/:id`        | `{ action: "hide"                                | "delete" | "restore", reason: "..." }` |
| `DELETE /api/admin/reports/:id`       | soft delete พร้อมเหตุผล                          |
| `POST /api/admin/reports/:id/restore` | กู้คืนพร้อมเหตุผล                                |
| `GET /api/admin/abuse-reports`        | การแจ้งเนื้อหาจากผู้เยี่ยมชม                     |
| `PATCH /api/admin/abuse-reports/:id`  | บันทึกว่าตรวจแล้ว                                |
| `GET /api/admin/spam-events`          | คะแนนและเหตุผลที่ระบบปฏิเสธ                      |
| `GET /api/admin/stats`                | สถิติสำหรับผู้ดูแล                               |
| `GET /api/admin/audit`                | ประวัติการซ่อน/ลบ/กู้คืน/ตั้งค่า                 |
| `GET/POST /api/admin/settings`        | อ่าน/แก้เพดานป้องกันสแปม                         |

Mutation endpoints ตรวจ Origin ให้ตรง `NEXT_PUBLIC_APP_URL` ตัวอย่าง API client จึงต้องส่ง `Origin` ด้วย ไม่รับข้อความหรือ role จาก client มาใช้ตัดสินสิทธิ์ผู้ดูแล และ public auth routes อนุญาตเฉพาะ sign-in, sign-out, get-session

## การป้องกันและความเป็นส่วนตัว

- เพดานเริ่มต้น 3 รายงาน/IP/ชั่วโมง, 10/IP/วัน, 5/guest session/ชั่วโมง ใช้ Lua กับ Valkey จึงตรวจและเพิ่มตัวนับแบบ atomic
- ตอบ `429` พร้อม `Retry-After` ไม่แบน IP ถาวร ผู้ดูแลปรับเพดานได้เพื่อรองรับโรงเรียน ร้านกาแฟ หรือเครือข่ายที่แชร์ IP
- ค่าเริ่มต้น **ไม่เชื่อ forwarded IP headers** หากไม่ได้ตั้ง trusted proxy จะใช้ bucket เครือข่ายร่วมและแยก guest เพิ่มเติม
- เปิด `TRUST_PROXY=true` และ `TRUSTED_IP_HEADER=cf-connecting-ip` ได้เมื่อ origin เข้าถึงผ่าน Cloudflare Tunnel เท่านั้น ต้องกันเส้นทางอื่นที่ปลอม header ได้ด้วย
- Turnstile ตรวจฝั่ง server ทุกการส่งเรื่อง/แจ้งเนื้อหา/อัปโหลด และเช็ก hostname, action, อายุ token ตาม config; key หายหรือ Valkey ล่มจะ fail closed
- signed guest ID อยู่ใน HttpOnly, SameSite=Lax cookie และ Secure ใน production; localStorage เก็บแค่ชื่อเล่น ไม่มี session/token ของผู้ดูแล
- idempotency และ fingerprint lock ป้องกัน double click และ concurrent duplicate requests ส่วน nearby report เปิดให้เพิ่มประสบการณ์คนละเรื่องในพิกัดเดิมได้
- ไม่ตัดสินว่าเรื่องไม่น่าเชื่อจึงเป็นสแปม ตรวจรูปแบบโจมตี โฆษณา URL อันตราย honeypot และข้อความซ้ำแทน
- React แสดงเนื้อหาเป็น text ไม่มีการ render HTML จากผู้ส่ง ข้อความที่เป็น markup โจมตีถูกปฏิเสธเพิ่มเติมฝั่ง server
- เปิดโหมดพิกัดอ่อนไหวเป็นค่าเริ่มต้น ปัดพิกัดก่อนบันทึก ไม่ใช่เพียงซ่อนตัวเลขใน UI
- การแจ้ง abuse จำนวนมากไม่ได้ทำให้เรื่องถูกลบเอง เฉพาะ privacy rule แคบ ๆ ที่ตรวจพบหมายเลขระบุตัวบุคคล 13 หลักในเนื้อหาต้นฉบับจึงซ่อนชั่วคราวพร้อม audit

การตรวจข้อความแบบกฎไม่ใช่ระบบเข้าใจความหมายสมบูรณ์ รายละเอียดส่วนตัวบางรูปแบบอาจหลุดการตรวจได้ ผู้ดูแลยังต้องดูแลการแจ้งเนื้อหา และผู้เล่าไม่ควรเปิดเผยชื่อจริง เบอร์โทร ที่อยู่ หรือข้อมูลของบุคคลอื่น

## ทดสอบ

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npx playwright install chromium
npm run test:e2e
# เพิ่ม smoke test พื้นแผนที่จริง ต้องเชื่อมต่อ OpenFreeMap ได้
LIVE_MAP_TEST=true npm run test:e2e
npm run build
```

- `npm test` รัน unit tests; integration suite จะ skip ถ้าไม่มี `TEST_DATABASE_URL`
- `test:integration` สร้าง `paranormal_test` แยกจากฐานข้อมูลแอป รัน migration และใช้ Valkey DB 15 ใช้ account ฐานข้อมูลที่มีสิทธิ์สร้าง test database บนเครื่องพัฒนา
- `test:e2e` ใช้ `paranormal_e2e`, Valkey DB 14, Next dev ที่ `localhost:3100` และบัญชีผู้ดูแลเฉพาะทดสอบ ไม่ใช้บัญชี production
- Integration tests ตรวจ Route Handlers จริงกับ PostgreSQL/PostGIS + Valkey จริง mock เฉพาะ HTTP response ของ Cloudflare
- Browser test มี fixture สำหรับ Turnstile widget และพื้นแผนที่เพื่อไม่ให้ผลขึ้นกับ third-party rendering แต่ server ยังเรียก Cloudflare Siteverify ด้วย development key จริง
- เคสหลักครอบคลุม anonymous publish → public map/search/detail/stats → admin login → delete → marker หาย → restore → กลับมา, รวม idempotency/concurrency, rate limit, XSS/honeypot, invalid captcha, RBAC และ private media

อย่าชี้ชุดทดสอบไปฐานข้อมูล production คำสั่งเตรียมทดสอบล้างข้อมูลเฉพาะฐานชื่อทดสอบที่กำหนดไว้

## ดูแลระบบและ retention

```bash
docker compose logs --tail=100 app media-worker
docker compose exec app node -e "fetch('http://localhost:3000/api/health').then(async r=>console.log(r.status,await r.text()))"
docker compose run --rm -T migrate npm run retention:purge
```

`RETENTION_DAYS` เริ่มต้น 90 วัน ขั้นต่ำ 7 วัน purge จะลบเนื้อหาที่ soft-deleted เกินกำหนด ลบไฟล์ใน storage ลบสถานที่ที่ไม่มีเรื่องเล่าเหลือ และลดอายุ spam telemetry โดยรักษา audit แบบสั้นไว้ คำสั่งนี้ลบถาวร ควรตั้ง schedule และ backup ตามนโยบายของระบบคุณ

สำรองทั้ง PostgreSQL และ object storage เพราะ volume ไม่ใช่ backup อย่าลบ Docker volumes ถ้าต้องการเก็บข้อมูลเดิม

## โครงสร้างที่น่ารู้

```text
src/app/                     pages, metadata, public/admin Route Handlers
src/components/              map, explorer, submission, report detail, admin
src/lib/                     validation, security, auth, media, spatial queries, Thai geocoding
src/data/                    simplified Thailand boundary used to keep pins inside the country
db/migrations/              PostgreSQL/PostGIS schema, constraints, indexes
scripts/                     migrate, fictional seed, bootstrap, media worker, purge
tests/                      unit, database integration, browser workflow
public/map-style.json        custom dark vector map style
compose.yaml                 production service topology
compose.dev.yaml             loopback ports for local Node development
docs/IMPLEMENTATION.md       implementation details, assumptions and limits
```

## ขอบเขตที่ยังมีอยู่

- ตอนนี้รับเรื่องเล่าเฉพาะพิกัดในประเทศไทย เมื่อเลือกหมุด ระบบถาม OpenStreetMap Nominatim ด้วยพิกัดที่ปัดแล้วเพื่อเติมจังหวัดและอำเภอ/เขต ถ้าผู้ให้บริการไม่ตอบ ยังกรอกเองได้
- ภาษาอังกฤษยังไม่ครบทุกข้อความ โดยเฉพาะหน้าแบบฟอร์มและหลังบ้าน
- เสียง/วิดีโอตรวจ malware และ signature แต่ไม่ได้ transcode หรือล้าง metadata ภายในทุก container format ควรตรวจไฟล์ส่วนตัวก่อนส่ง
- การส่งวิดีโอผ่าน proxy ยังไม่มี byte-range optimization เหมาะกับไฟล์ขนาดไม่เกินเพดาน 20 MB
- การเลื่อนข้อมูลแผนที่ใช้ pagination สูงสุด 500 รายงานต่อหน้า หากข้อมูลโตมากควรเพิ่ม tiled GeoJSON/vector service ฝั่ง server
- ไม่มีระบบบัญชีสมาชิก public, คอมเมนต์ หรือ management link แก้เรื่องด้วย secret token ส่วนนี้เป็น optional และไม่ได้ใช้ชื่อเล่นเป็นสิทธิ์แก้/ลบ
- dependency audit ของ production และ dev แยกกัน หาก advisory ใน tooling ยังไม่มี patch ต้องประเมินใน CI เพิ่มเติม ดูผลตรวจล่าสุดใน [verification record](docs/VERIFICATION.md)

เอกสารอ้างอิงที่ใช้ตรวจพฤติกรรม: [Next.js support policy](https://nextjs.org/support-policy), [MapLibre API](https://maplibre.org/maplibre-gl-js/docs/API/), [Turnstile server verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Better Auth options](https://better-auth.com/docs/reference/options), [OpenFreeMap quick start](https://openfreemap.org/quick_start/)

ถ้าจะเอาเว็บนี้ไปใช้จริง ช่วยให้เรื่องเล่าเป็นเรื่องเล่า อย่าใช้มันไปคุกคามคนในพื้นที่ บุกรุกบ้านคนอื่น หรือประกาศว่าที่ไหน “มีผีแน่นอน” เพราะสุดท้ายคนที่น่ากลัวที่สุดอาจไม่ใช่คนที่มองไม่เห็นครับ
