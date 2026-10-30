import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const $ = id => document.getElementById(id);
const BUCKET = 'gallery-assets';
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const MAX_BYTES = 70 * 1024 * 1024;
const FAVORITES_KEY = 'ada-gallery-favorites-v1';
const ROLE_KEY = 'ada-gallery-role-v1';
const icon = name => `<svg class="svg-icon"><use href="#i-${name}"></use></svg>`;
let client, artworks = [], visible = [], favorites = new Set(), mode = null, galleryLoadError = '';
let currentId = null, editingId = null, incomingFile = null, previewURL = null, busy = false, toastTimer;
let activeTab = 'all', activeCategory = 'all';

const configured = () => /^https:\/\/.+\.supabase\.co$/i.test(SUPABASE_URL) && !SUPABASE_PUBLISHABLE_KEY.includes('YOUR_');
const categoryName = value => value === 'cats' ? 'Kedi' : 'Çizimler';
const escapeFilename = value => String(value || 'resim').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim() || 'resim';
const extensionFor = mime => ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif'})[mime] || 'img';
const dateText = iso => new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'long',year:'numeric'}).format(new Date(iso));
const shortDate = iso => new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(iso));
const pad = value => String(value).padStart(2, '0');

function notify(message) { const node = $('toast'); node.textContent = message; node.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('visible'), 4200); }
function lock() { document.body.classList.toggle('locked', ['entry','editOverlay','detailOverlay','backupOverlay','deleteOverlay','authOverlay'].some(id => !$(id).hidden)); }
function show(id) { $(id).hidden = false; lock(); }
function hide(id) { $(id).hidden = true; lock(); }
function saveFavorites() { try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites])); } catch { notify('Favoriler bu cihazda kaydedilemedi.'); } }
function toggleFavorite(archiveId) { favorites.has(archiveId) ? favorites.delete(archiveId) : favorites.add(archiveId); saveFavorites(); render(); if (currentId) updateDetailFavorite(); }

async function signedUrl(path) {
  if (!path) return '';
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
async function toArtwork(row) {
  const [originalUrl, thumbUrl] = await Promise.all([signedUrl(row.storage_path), signedUrl(row.thumb_path || row.storage_path)]);
  return {...row, originalUrl, thumbUrl, archiveId: row.archive_id, createdAt: row.created_at, aspectRatio: Number(row.aspect_ratio) || .8};
}
async function reload({quiet = false} = {}) {
  if (!configured()) { artworks = []; render(); notify('Supabase bağlantısı henüz yapılandırılmadı. README adımlarını uygula.'); return; }
  if (!quiet) $('galleryCount').textContent = 'Yükleniyor…';
  const { data, error } = await client.from('gallery_assets').select('*').order('created_at', {ascending:false});
  if (error) { galleryLoadError = 'Galeri yüklenemedi. Bağlantıyı kontrol edip yeniden dene.'; render(); throw error; }
  artworks = await Promise.all(data.map(toArtwork)); galleryLoadError = '';
  render();
}
function getVisible() {
  const q = $('search').value.trim().toLocaleLowerCase('tr');
  const sort = $('sort').value;
  const found = artworks.filter(a => (activeTab !== 'favorites' || favorites.has(a.archiveId)) && (activeCategory === 'all' || a.category === activeCategory) && (!q || `${a.title} ${a.description || ''}`.toLocaleLowerCase('tr').includes(q)));
  return found.sort((a,b) => sort === 'new' ? new Date(b.createdAt) - new Date(a.createdAt) : sort === 'old' ? new Date(a.createdAt) - new Date(b.createdAt) : a.title.localeCompare(b.title, 'tr'));
}
function render() {
  visible = getVisible(); const gallery = $('gallery'); gallery.replaceChildren();
  $('galleryCount').textContent = `${visible.length} resim`; $('heroCount').textContent = `${pad(artworks.length)} RESİM`;
  $('allCount').textContent = String(artworks.length); $('favoritesCount').textContent = String(artworks.filter(a => favorites.has(a.archiveId)).length);
  document.querySelectorAll('[data-tab]').forEach(node => { const active = node.dataset.tab === activeTab; node.classList.toggle('active', active); node.setAttribute('aria-pressed', active); });
  document.querySelectorAll('[data-category]').forEach(node => { const active = node.dataset.category === activeCategory; node.classList.toggle('active', active); node.setAttribute('aria-pressed', active); });
  const noArt = artworks.length === 0; $('empty').hidden = visible.length !== 0; $('emptyTitle').textContent = galleryLoadError ? 'Galeriye ulaşılamadı.' : noArt ? 'Henüz resim yok.' : activeTab === 'favorites' ? 'Favori resim yok.' : 'Resim bulunamadı.'; $('emptyText').textContent = galleryLoadError; $('emptyText').hidden = !galleryLoadError; $('retryLoad').hidden = !galleryLoadError; $('emptyAdd').hidden = !noArt || mode !== 'curator' || Boolean(galleryLoadError);
  const fragment = document.createDocumentFragment();
  for (const art of visible) {
    const card = document.createElement('article'); card.className = 'art-card';
    const open = document.createElement('button'); open.type = 'button'; open.className = 'card-open'; open.setAttribute('aria-label', `${art.title} resmini görüntüle`);
    const img = document.createElement('img'); img.className = 'card-photo'; img.loading = 'lazy'; img.decoding = 'async'; img.alt = art.title; img.src = art.thumbUrl; img.style.setProperty('--ratio', String(Math.max(.62, Math.min(1.6, art.aspectRatio))));
    const bottom = document.createElement('div'); bottom.className = 'card-bottom'; const meta = document.createElement('div');
    const title = document.createElement('div'); title.className = 'card-title'; title.textContent = art.title;
    const date = document.createElement('div'); date.className = 'card-date'; date.textContent = shortDate(art.createdAt);
    const category = document.createElement('div'); category.className = 'card-category'; category.textContent = categoryName(art.category);
    const arrow = document.createElement('span'); arrow.className = 'card-arrow'; arrow.innerHTML = icon('up-right'); meta.append(title,date,category); bottom.append(meta,arrow); open.append(img,bottom); open.onclick = () => openDetail(art.id);
    const fav = document.createElement('button'); fav.type = 'button'; fav.className = 'favorite-btn'; const saved = favorites.has(art.archiveId); fav.classList.toggle('active', saved); fav.setAttribute('aria-label', saved ? 'Favorilerden çıkar' : 'Favoriye ekle'); fav.innerHTML = icon('heart'); fav.onclick = () => toggleFavorite(art.archiveId); card.append(open,fav); fragment.append(card);
  }
  gallery.append(fragment);
}


function setMode(next) {
  mode = next; try { localStorage.setItem(ROLE_KEY, next); } catch {}
  $('entry').hidden = true; $('switchMode').innerHTML = icon(mode === 'curator' ? 'pencil' : 'eye') + `<span>${mode === 'curator' ? 'Ekleyici' : 'İzleyici'}</span>`;
  const editorUI = mode === 'curator'; $('addOpen').hidden = !editorUI; $('backupOpen').hidden = !editorUI; $('editFromDetail').hidden = !editorUI; $('signOut').hidden = true;
  const picker = $('modePicker'); if (picker) picker.hidden = true; $('switchMode').setAttribute('aria-expanded', 'false');
  render(); lock(); window.scrollTo({top:0, behavior:'auto'});
}
function chooseMode(next) { setMode(next); }
function updateDetailFavorite() { const art = artworks.find(a => a.id === currentId); if (!art) return; const saved = favorites.has(art.archiveId); $('detailFavorite').classList.toggle('active', saved); $('detailFavoriteLabel').textContent = saved ? 'Favorilerden çıkar' : 'Favoriye ekle'; }
function openDetail(id) { const art = artworks.find(a => a.id === id); if (!art) return; currentId = id; $('detailImage').src = art.originalUrl; $('detailImage').alt = art.title; $('detailTitle').textContent = art.title; $('detailCategory').textContent = categoryName(art.category); $('detailDesc').textContent = art.description || ''; $('detailDesc').hidden = !art.description; $('detailDate').textContent = dateText(art.createdAt); const index = visible.findIndex(a => a.id === id); $('detailNumber').textContent = `RESİM ${String(index + 1).padStart(3,'0')} / ${String(visible.length).padStart(3,'0')}`; $('prevArt').disabled = index <= 0; $('nextArt').disabled = index >= visible.length - 1; $('editFromDetail').hidden = mode !== 'curator'; updateDetailFavorite(); show('detailOverlay'); }
function closeDetail() { hide('detailOverlay'); $('detailImage').removeAttribute('src'); currentId = null; }
function navigate(delta) { const at = visible.findIndex(a => a.id === currentId); if (visible[at + delta]) openDetail(visible[at + delta].id); }

function releasePreview() { if (previewURL) URL.revokeObjectURL(previewURL); previewURL = null; }
function setPreview(fileOrUrl) { releasePreview(); const image = $('imagePreview'); if (!fileOrUrl) { image.hidden = true; image.removeAttribute('src'); $('dropPrompt').hidden = false; $('changePhoto').hidden = true; return; } previewURL = typeof fileOrUrl === 'string' ? null : URL.createObjectURL(fileOrUrl); image.src = previewURL || fileOrUrl; image.hidden = false; $('dropPrompt').hidden = true; $('changePhoto').hidden = false; }
async function verifyImage(file) { if (!TYPES.has(file.type)) throw new Error('JPG, PNG, WEBP, GIF veya AVIF görsel seç.'); if (file.size > MAX_BYTES) throw new Error('Dosya 70 MB sınırını aşıyor.'); try { const bitmap = await createImageBitmap(file); bitmap.close(); } catch { throw new Error('Dosya geçerli bir görsel olarak okunamadı.'); } }
async function makeThumb(file) { try { const bitmap = await createImageBitmap(file); const ratio = bitmap.width / bitmap.height; const scale = Math.min(1, 680 / Math.max(bitmap.width, bitmap.height)); const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale)); canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close(); const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .82)); return { blob: blob || file, ratio }; } catch { return {blob:file, ratio:.8}; } }
async function assignFile(file) { if (!file) return; try { await verifyImage(file); incomingFile = file; setPreview(file); if (!editingId && !$('artTitle').value.trim()) $('artTitle').value = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').slice(0,100); } catch (error) { notify(error.message); } }
function openEdit(id = null) { if (mode !== 'curator') return chooseMode('curator'); editingId = id; incomingFile = null; $('artForm').reset(); const art = id && artworks.find(a => a.id === id); $('editKicker').textContent = art ? 'RESMİ DÜZENLE' : 'RESİM EKLE'; $('editTitle').textContent = art ? 'Resmi düzenle' : 'Yeni resim'; $('deleteArt').hidden = !art; $('saveLabel').textContent = art ? 'Kaydet' : 'Resmi ekle'; $('artTitle').value = art?.title || ''; $('artDesc').value = art?.description || ''; $('artCategory').value = art?.category || 'drawings'; $('dateHint').textContent = art ? `Eklenme tarihi: ${dateText(art.createdAt)} (değişmez)` : 'Eklenme tarihi sunucuda otomatik kaydedilir.'; setPreview(art?.originalUrl || null); show('editOverlay'); }
function closeEdit() { hide('editOverlay'); releasePreview(); incomingFile = null; editingId = null; }
function requireEditor() { if (mode !== 'curator') throw new Error('Önce Ekleyici moduna geç.'); }
async function uploadFile(path, file, options = {}) { const { error } = await client.storage.from(BUCKET).upload(path, file, {cacheControl:'31536000', upsert:false, contentType:file.type, ...options}); if (error) throw error; }
async function removeFiles(paths) { const clean = paths.filter(Boolean); if (!clean.length) return; const { error } = await client.storage.from(BUCKET).remove(clean); if (error) throw error; }
async function saveArt(event) {
  event.preventDefault(); if (busy) return; const title = $('artTitle').value.trim(), description = $('artDesc').value.trim(), category = $('artCategory').value; if (!title) return notify('Resmin adını yaz.'); const old = editingId && artworks.find(a => a.id === editingId); if (!old && !incomingFile) return notify('Önce bir görsel seç.');
  busy = true; $('saveBtn').disabled = true; $('saveLabel').textContent = 'Kaydediliyor…'; let uploaded = [];
  try { requireEditor(); let storagePath = old?.storage_path, thumbPath = old?.thumb_path, mimeType = old?.mime_type, ratio = old?.aspect_ratio; if (incomingFile) { const archiveId = old?.archive_id || crypto.randomUUID(); const version = crypto.randomUUID(); const thumb = await makeThumb(incomingFile); storagePath = `assets/${archiveId}/original-${version}.${extensionFor(incomingFile.type)}`; thumbPath = `assets/${archiveId}/thumb-${version}.jpg`; mimeType = incomingFile.type; ratio = thumb.ratio; await uploadFile(storagePath, incomingFile); uploaded.push(storagePath); await uploadFile(thumbPath, thumb.blob, {contentType:'image/jpeg'}); uploaded.push(thumbPath); const record = {archive_id:archiveId, title, description, category, storage_path:storagePath, thumb_path:thumbPath, mime_type:mimeType, aspect_ratio:ratio}; const query = old ? client.from('gallery_assets').update(record).eq('id',old.id) : client.from('gallery_assets').insert(record); const {error} = await query; if (error) throw error; if (old) await removeFiles([old.storage_path, old.thumb_path].filter(path => path && path !== storagePath && path !== thumbPath)); } else { const {error} = await client.from('gallery_assets').update({title,description,category}).eq('id',old.id); if (error) throw error; }
    closeEdit(); await reload({quiet:true}); notify(old ? 'Resim güncellendi.' : 'Resim eklendi.');
  } catch (error) { if (uploaded.length) { try { await removeFiles(uploaded); } catch {} } console.error(error); notify(`Kaydedilemedi: ${error.message || 'ağ veya depolama hatası'}`); }
  finally { busy = false; $('saveBtn').disabled = false; $('saveLabel').textContent = editingId ? 'Kaydet' : 'Resmi ekle'; }
}
function askDelete() { const art = artworks.find(a => a.id === editingId); if (!art) return; $('deleteMessage').textContent = `“${art.title}” kalıcı olarak silinecek.`; show('deleteOverlay'); }
async function confirmDelete() { const art = artworks.find(a => a.id === editingId); if (!art || busy) return; busy = true; $('confirmDelete').disabled = true; try { requireEditor(); const {error} = await client.from('gallery_assets').delete().eq('id', art.id); if (error) throw error; let cleanupError = null; try { await removeFiles([art.storage_path,art.thumb_path]); } catch (storageError) { cleanupError = storageError; } favorites.delete(art.archiveId); saveFavorites(); hide('deleteOverlay'); closeEdit(); closeDetail(); await reload({quiet:true}); notify(cleanupError ? `Kayıt silindi; dosya temizlenemedi: ${cleanupError.message}` : 'Resim silindi.'); } catch (error) { notify(`Resim silinemedi: ${error.message || 'ağ hatası'}`); } finally { busy = false; $('confirmDelete').disabled = false; } }
async function downloadOriginal() { const art = artworks.find(a => a.id === currentId); if (!art) return; try { const res = await fetch(art.originalUrl); if (!res.ok) throw new Error('indirme bağlantısı alınamadı'); const link = document.createElement('a'); link.href = URL.createObjectURL(await res.blob()); link.download = `${escapeFilename(art.title)}.${extensionFor(art.mime_type)}`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 15000); } catch (error) { notify('İndirilemedi: ' + error.message); } }

const encoder = new TextEncoder(), decoder = new TextDecoder();
const crcTable = (() => { const out = new Uint32Array(256); for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xEDB88320^(c>>>1):c>>>1;out[i]=c>>>0;} return out; })();
const crc32 = async blob => { const bytes = new Uint8Array(await blob.arrayBuffer()); let c = 0xffffffff; for(const byte of bytes)c=crcTable[(c^byte)&255]^(c>>>8); return (c^0xffffffff)>>>0; };
const u16=(v,o,n)=>v.setUint16(o,n,true), u32=(v,o,n)=>v.setUint32(o,n,true);
async function zipBuild(entries) { let offset=0; const chunks=[], central=[]; for (const item of entries) { const name=encoder.encode(item.name), size=item.blob.size, crc=await crc32(item.blob), h=new Uint8Array(30+name.length), v=new DataView(h.buffer); u32(v,0,0x04034b50);u16(v,4,20);u16(v,6,0x0800);u32(v,14,crc);u32(v,18,size);u32(v,22,size);u16(v,26,name.length);h.set(name,30);chunks.push(h,item.blob); const c=new Uint8Array(46+name.length),cv=new DataView(c.buffer);u32(cv,0,0x02014b50);u16(cv,4,20);u16(cv,6,20);u16(cv,8,0x0800);u32(cv,16,crc);u32(cv,20,size);u32(cv,24,size);u16(cv,28,name.length);u32(cv,42,offset);c.set(name,46);central.push(c);offset+=h.length+size; } const length=central.reduce((n,c)=>n+c.length,0), end=new Uint8Array(22),v=new DataView(end.buffer);u32(v,0,0x06054b50);u16(v,8,entries.length);u16(v,10,entries.length);u32(v,12,length);u32(v,16,offset);return new Blob([...chunks,...central,end],{type:'application/zip'}); }
async function zipRead(file) { const data=await file.arrayBuffer(), view=new DataView(data); let e=-1; for(let p=data.byteLength-22;p>=Math.max(0,data.byteLength-65557);p--)if(view.getUint32(p,true)===0x06054b50){e=p;break;} if(e<0)throw Error('Geçerli ZIP bulunamadı.'); const count=view.getUint16(e+10,true); if(count>1500)throw Error('Çok fazla dosya.'); let pos=view.getUint32(e+16,true);const files=new Map();for(let i=0;i<count;i++){if(view.getUint32(pos,true)!==0x02014b50)throw Error('ZIP bozuk.');const method=view.getUint16(pos+10,true),size=view.getUint32(pos+20,true),n=view.getUint16(pos+28,true),extra=view.getUint16(pos+30,true),comment=view.getUint16(pos+32,true),local=view.getUint32(pos+42,true);if(method!==0||view.getUint32(local,true)!==0x04034b50)throw Error('Yalnızca uygulamanın sıkıştırılmamış ZIP yedekleri desteklenir.');const name=decoder.decode(new Uint8Array(data,pos+46,n));const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);if(start+size>data.byteLength)throw Error('ZIP bozuk.');files.set(name,file.slice(start,start+size));pos+=46+n+extra+comment;}return files; }
async function exportBackup() { if (!artworks.length) return notify('Yedeklenecek resim yok.'); busy=true; $('exportBackup').disabled=true; $('exportBackup').textContent='Hazırlanıyor…';try { const entries=[], manifest={format:'izler-gallery',version:1,exportedAt:new Date().toISOString(),works:[],favorites:[...favorites]}; for (const art of artworks) { const response=await fetch(art.originalUrl);if(!response.ok)throw Error(`${art.title} indirilemedi`);const blob=await response.blob(),path=`resimler/${art.archiveId}.${extensionFor(art.mime_type)}`;entries.push({name:path,blob});manifest.works.push({archiveId:art.archiveId,title:art.title,description:art.description,category:art.category,createdAt:art.createdAt,file:path,mime:art.mime_type}); } entries.unshift({name:'koleksiyon.json',blob:new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'})});const link=document.createElement('a');link.href=URL.createObjectURL(await zipBuild(entries));link.download=`ada-galeri-yedek-${new Date().toISOString().slice(0,10)}.zip`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),15000);notify(`${artworks.length} resim yedeklendi.`); } catch(error) { notify('Yedek oluşturulamadı: '+error.message); } finally {busy=false;$('exportBackup').disabled=false;$('exportBackup').textContent='ZIP yedeği oluştur';} }
async function importWork(work, original) { const archiveId = String(work.archiveId || crypto.randomUUID()); const existing=artworks.some(a=>a.archiveId===archiveId);if(existing)return false;const mime=TYPES.has(work.mime)?work.mime:'image/jpeg', file=new File([original],`${archiveId}.${extensionFor(mime)}`,{type:mime});await verifyImage(file);const thumb=await makeThumb(file), storage=`assets/${archiveId}/original.${extensionFor(mime)}`, preview=`assets/${archiveId}/thumb.jpg`;await uploadFile(storage,file);try{await uploadFile(preview,thumb.blob,{contentType:'image/jpeg'});const {error}=await client.from('gallery_assets').insert({archive_id:archiveId,title:String(work.title).slice(0,100),description:String(work.description||'').slice(0,3000),category:work.category==='cats'?'cats':'drawings',storage_path:storage,thumb_path:preview,mime_type:mime,aspect_ratio:thumb.ratio});if(error)throw error;}catch(error){try{await removeFiles([storage,preview]);}catch{}throw error;}return true; }
async function importBackup(file) { if (!file||busy)return;busy=true;$('importBackupBtn').disabled=true;$('importBackupBtn').textContent='Geri yükleniyor…';try{requireEditor();const files=await zipRead(file), manifest=JSON.parse(await files.get('koleksiyon.json')?.text() || 'null');if(manifest?.format!=='izler-gallery'||manifest.version!==1||!Array.isArray(manifest.works))throw Error('Geçersiz yedek biçimi.');let added=0, skipped=0;for(const work of manifest.works){if(!work.title||!work.file||!files.has(work.file))throw Error('Yedekte eksik resim bilgisi var.');if(await importWork(work,files.get(work.file)))added++;else skipped++;}if(Array.isArray(manifest.favorites)){manifest.favorites.forEach(id=>favorites.add(id));saveFavorites();}await reload({quiet:true});hide('backupOverlay');notify(`${added} resim eklendi${skipped?`, ${skipped} zaten vardı`:''}.`);}catch(error){notify('Yedek yüklenemedi: '+error.message);}finally{busy=false;$('importBackupBtn').disabled=false;$('importBackupBtn').textContent='ZIP dosyası seç';$('importBackupFile').value='';}}
async function readLegacy() { return new Promise((resolve,reject)=>{const request=indexedDB.open('izler-gallery-1',1);request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains('artworks'))return resolve([]);const query=db.transaction('artworks','readonly').objectStore('artworks').getAll();query.onsuccess=()=>resolve(query.result||[]);query.onerror=()=>reject(query.error);};request.onerror=()=>reject(request.error);}); }
async function migrateLocal() { busy=true;$('migrateLocalBtn').disabled=true;$('migrateLocalBtn').textContent='Aktarılıyor…';try{requireEditor();const local=await readLegacy();let added=0,skipped=0;for(const item of local){if(!item.original||!item.title)continue;const id=item.archiveId||crypto.randomUUID();if(artworks.some(a=>a.archiveId===id)){skipped++;continue;}if(await importWork({archiveId:id,title:item.title,description:item.description,category:item.category,mime:item.mime},item.original))added++;}await reload({quiet:true});notify(`${added} yerel resim buluta aktarıldı${skipped?`, ${skipped} zaten vardı`:''}.`);}catch(error){notify('Aktarım yapılamadı: '+error.message);}finally{busy=false;$('migrateLocalBtn').disabled=false;$('migrateLocalBtn').textContent='Yerel resimleri aktar';}}

function events() {
  document.querySelectorAll('[data-enter]').forEach(button=>button.addEventListener('click',()=>chooseMode(button.dataset.enter)));
  document.querySelectorAll('[data-mode-option]').forEach(button => button.addEventListener('click', () => chooseMode(button.dataset.modeOption)));
  document.addEventListener('click', event => {
    const picker = $('modePicker'), switcher = $('switchMode');
    if (picker && !picker.hidden && !picker.contains(event.target) && !switcher.contains(event.target)) {
      picker.hidden = true; switcher.setAttribute('aria-expanded', 'false');
    }
  });
  $('switchMode').addEventListener('keydown', event => {
    if (event.key === 'Escape') { $('modePicker').hidden = true; $('switchMode').setAttribute('aria-expanded', 'false'); }
  });
  $('addOpen').onclick=()=>openEdit();$('emptyAdd').onclick=()=>openEdit();$('retryLoad').onclick=async()=>{try{await reload();}catch(error){notify('Yeniden deneme başarısız: '+error.message);}};$('backupOpen').onclick=()=>show('backupOverlay');$('backupClose').onclick=()=>hide('backupOverlay');$('editClose').onclick=closeEdit;$('detailClose').onclick=closeDetail;$('cancelDelete').onclick=()=>hide('deleteOverlay');$('confirmDelete').onclick=confirmDelete;$('deleteArt').onclick=askDelete;$('artForm').onsubmit=saveArt;$('exportBackup').onclick=exportBackup;$('importBackupBtn').onclick=()=>$('importBackupFile').click();$('importBackupFile').onchange=event=>importBackup(event.target.files[0]);$('migrateLocalBtn').onclick=migrateLocal;
  $('search').oninput=render;$('sort').onchange=render;document.querySelectorAll('[data-tab]').forEach(node=>node.onclick=()=>{activeTab=node.dataset.tab;render();});document.querySelectorAll('[data-category]').forEach(node=>node.onclick=()=>{activeCategory=node.dataset.category;render();});
  $('dropzone').onclick=()=>$('artFile').click();$('dropzone').onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();$('artFile').click();}};$('artFile').onchange=event=>assignFile(event.target.files[0]);['dragenter','dragover'].forEach(type=>$('dropzone').addEventListener(type,event=>{event.preventDefault();$('dropzone').classList.add('dragging');}));['dragleave','drop'].forEach(type=>$('dropzone').addEventListener(type,event=>{event.preventDefault();$('dropzone').classList.remove('dragging');}));$('dropzone').addEventListener('drop',event=>assignFile(event.dataTransfer.files[0]));
  $('prevArt').onclick=()=>navigate(-1);$('nextArt').onclick=()=>navigate(1);$('editFromDetail').onclick=()=>openEdit(currentId);$('detailFavorite').onclick=()=>{const art=artworks.find(a=>a.id===currentId);if(art)toggleFavorite(art.archiveId);};$('downloadOriginal').onclick=downloadOriginal;document.addEventListener('keydown',event=>{if(event.key==='Escape')['authOverlay','deleteOverlay','editOverlay','backupOverlay','detailOverlay'].find(id=>!$(id).hidden) && hide(['authOverlay','deleteOverlay','editOverlay','backupOverlay','detailOverlay'].find(id=>!$(id).hidden));else if(!$('detailOverlay').hidden&&event.key==='ArrowRight')navigate(1);else if(!$('detailOverlay').hidden&&event.key==='ArrowLeft')navigate(-1);});
}
async function init() { events(); try { favorites=new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]')); } catch {} if (!configured()) { render(); $('entry').hidden=false;lock();return; } if (!window.supabase) throw Error('Supabase kitaplığı yüklenemedi.'); client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}); await reload(); const saved=localStorage.getItem(ROLE_KEY); if(saved==='curator'||saved==='viewer')setMode(saved);else{$('entry').hidden=false;lock();}  } catch(error) { console.error(error);render();$('entry').hidden=false;lock();notify('Galeri yüklenemedi: '+(error.message||'bağlantı hatası'));} }
init();

