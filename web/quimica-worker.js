/* RDKit se ejecuta fuera del hilo de interfaz. Solo recursos del propio sitio. */
self.onmessage=async({data})=>{
 let mol;
 try {
  if(typeof data!=='string'||!data.trim()||data.length>250000)throw new Error('Introduce una estructura de hasta 250 KB.');
  importScripts('rdkit.js');
  const kit=await initRDKitModule({locateFile:()=>new URL('RDKit_minimal.wasm',self.location.href).href});
  mol=kit.get_mol(data);
  if(!mol || !mol.is_valid())throw new Error('No se pudo interpretar la molécula. Revisa los enlaces y la estructura.');
  if(!mol.has_coords())mol.set_new_coords();
  self.postMessage({ok:true,mol:mol.get_molblock(),smiles:mol.get_smiles(),svg:mol.get_svg(1000,640),descriptores:JSON.parse(mol.get_descriptors()),version:kit.version()});
 }catch(e){self.postMessage({ok:false,error:e instanceof Error?e.message:'No se pudo analizar la estructura.'});}
 finally{mol?.delete();}
};
