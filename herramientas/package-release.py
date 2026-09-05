"""Build a ready-to-serve archive from public/, excluding local capture pages."""
from pathlib import Path
import zipfile,hashlib,json
root=Path(__file__).resolve().parent.parent
version=json.loads((root/'package.json').read_text())['version']
out=root/'dist';out.mkdir(exist_ok=True)
zip_path=out/f'erlen-slides-{version}-web.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
 for f in sorted((root/'public').rglob('*')):
  if f.is_file() and not f.name.startswith('_capture-'):z.write(f,f.relative_to(root/'public'))
 for name in ['README.md','THIRD_PARTY_NOTICES.md','CITATION.cff']:
  z.write(root/name,name)
 for dirname in ['docs','examples']:
  for f in sorted((root/dirname).rglob('*')):
   if f.is_file():z.write(f,f.relative_to(root))
checksum=hashlib.sha256(zip_path.read_bytes()).hexdigest()
(out/(zip_path.name+'.sha256')).write_text(checksum+'  '+zip_path.name+'\n')
print(zip_path,zip_path.stat().st_size,'bytes',checksum)
