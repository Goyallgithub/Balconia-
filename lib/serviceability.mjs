import config from './coverage/config.json' with { type: 'json' };
import territory from './coverage/gurugram-city.json' with { type: 'json' };
export { config };
export class CoverageError extends Error { constructor(message,status=422){super(message);this.status=status;} }
export function validPoint(p){return p && typeof p.lat==='number' && typeof p.lng==='number' && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat)<=90 && Math.abs(p.lng)<=180;}
export function distanceKm(a,b){const r=Math.PI/180,dlat=(b.lat-a.lat)*r,dlng=(b.lng-a.lng)*r;const h=Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlng/2)**2;return 6371.0088*2*Math.asin(Math.sqrt(Math.min(1,h)));}
function onSegment(p,a,b){const cross=(p[1]-a[1])*(b[0]-a[0])-(p[0]-a[0])*(b[1]-a[1]);return Math.abs(cross)<1e-12 && p[0]>=Math.min(a[0],b[0])-1e-10 && p[0]<=Math.max(a[0],b[0])+1e-10 && p[1]>=Math.min(a[1],b[1])-1e-10 && p[1]<=Math.max(a[1],b[1])+1e-10;}
function ringContains(p,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if(onSegment(p,a,b))return true;if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
const compiled=new WeakMap();
export function insideTerritory(point,data=territory){if(!validPoint(point))return false;let polygons=compiled.get(data);if(!polygons){polygons=data.features.flatMap(f=>{const g=f.geometry;return (g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[]).map(r=>({rings:r,bounds:r[0].reduce((b,c)=>[Math.min(b[0],c[0]),Math.min(b[1],c[1]),Math.max(b[2],c[0]),Math.max(b[3],c[1])],[Infinity,Infinity,-Infinity,-Infinity])}));});compiled.set(data,polygons);}const p=[point.lng,point.lat];return polygons.some(({rings:r,bounds:b})=>p[0]>=b[0]&&p[0]<=b[2]&&p[1]>=b[1]&&p[1]<=b[3]&&ringContains(p,r[0])&&!r.slice(1).some(h=>ringContains(p,h)));}
export function preliminary(pin){
 if(typeof pin!=='string'||!/^[1-9]\d{5}$/.test(pin))throw new CoverageError('Please enter a valid six-digit Indian PIN code.',400);
 return {version:config.version,level:'preliminary',pin,productDelivery:'needs_location',makeover:'needs_location',distanceKm:null,localities:[],requiresExactAddress:true,message:'Product delivery covers Delhi NCR. Your complete delivery address will be verified at checkout. You can browse freely.'};
}
const normalize=s=>String(s||'').toLowerCase().replace(/ district$/,'').replace(/[^a-z]/g,'');
export function ncrMember(admin){const regions=config.deliveryTerritory.regions;const region=Object.keys(regions).find(r=>normalize(r)===normalize(admin?.region));return Boolean(admin?.country==='IND'&&region&&(regions[region].includes('*')||regions[region].some(d=>normalize(d)===normalize(admin.district))));}
export function evaluateLocation(point,pin,admin){preliminary(pin);if(!validPoint(point))throw new CoverageError('Select a valid map location.',400);const delivery=ncrMember(admin),inCity=insideTerritory(point),distance=distanceKm(config.hub,point),makeover=delivery&&inCity&&distance<=config.makeoverRadiusKm+1e-9;return {version:config.version,level:'location',pin,productDelivery:delivery?'available':'unavailable',makeover:makeover?'available':'unavailable',distanceKm:Math.round(distance*1000)/1000,insideCity:inCity,location:{lat:point.lat,lng:point.lng},message:!delivery?'This address is outside our configured Delhi NCR delivery area. You can still browse Balconia, but we cannot accept an order for this address.':!makeover?config.deliveryOnlyMessage:'Product delivery and balcony makeover consultations are available at this location.'};}
async function providerJson(u,env,fetcher){if(env.ARCGIS_GEOCODING_API_KEY)u.searchParams.set('token',env.ARCGIS_GEOCODING_API_KEY);try{const r=await fetcher(u,{signal:AbortSignal.timeout(9000)});if(!r.ok)throw Error();const data=await r.json();if(data.error)throw Error();return data;}catch{throw new CoverageError('Address verification is temporarily unavailable. You can browse freely; please try again before placing an order.',503);}}
const postalCache=new Map();
export async function checkPostal(pin,env={},fetcher=fetch){
 const base=preliminary(pin),hit=postalCache.get(pin);if(hit&&hit.until>Date.now())return hit.result;
 // Prefer curated NCR PIN table (works without ArcGIS — fixes local pincode errors)
 const listed=config.pins?.[pin];
 if(listed?.enabled){
  const makeover=listed.makeover||(listed.makeoverAvailable===false?'unavailable':'pending_confirmation');
  const message=listed.message||(makeover==='unavailable'
    ?'We deliver across Delhi NCR. Balcony makeover installation is currently limited to select service areas.'
    :'We deliver across Delhi NCR. Final coverage is confirmed using your complete address at checkout.');
  const result={...base,productDelivery:'available_preliminary',makeover,localities:listed.localities||[],region:listed.region||null,city:listed.city||(listed.localities||[])[0]||null,message,source:'curated_pins'};
  postalCache.set(pin,{result,until:Date.now()+900000});return result;
 }
 // Delhi / Gurugram / Noida / Faridabad / Ghaziabad common prefixes when ArcGIS is unavailable
 const prefix=pin.slice(0,3);
 const ncrPrefix=['110','121','122','201'].includes(prefix);
 try{
  const u=new URL(config.geocoding.endpoint);u.search=new URLSearchParams({SingleLine:pin+', India',sourceCountry:'IND',outFields:'Addr_type,Postal,Region,Subregion,Country,City',maxLocations:'5',f:'json'}).toString();
  const data=await providerJson(u,env,fetcher),matches=(data.candidates||[]).filter(c=>c.attributes?.Addr_type==='Postal'&&c.attributes.Postal===pin&&c.attributes.Country==='IND'&&c.score>=95),eligible=matches.some(c=>ncrMember({region:c.attributes.Region,district:c.attributes.Subregion,country:c.attributes.Country}));
  const result={...base,productDelivery:eligible?'available_preliminary':matches.length?'unavailable':'verification_pending',makeover:eligible?'unavailable':'unavailable',localities:matches.map(c=>c.attributes.City||c.attributes.Subregion).filter(Boolean),region:eligible?matches.find(c=>ncrMember({region:c.attributes.Region,district:c.attributes.Subregion,country:c.attributes.Country})).attributes.Region:null,city:eligible?matches.find(c=>ncrMember({region:c.attributes.Region,district:c.attributes.Subregion,country:c.attributes.Country})).attributes.City:null,message:eligible?'We deliver across Delhi NCR. Final coverage is confirmed using your complete address at checkout.':matches.length?'We currently deliver within Delhi NCR. You can browse freely, but orders to this address cannot be accepted.':'This PIN could not be verified. You can browse freely; your exact address must be verified before ordering.'};
  if(postalCache.size>=500)postalCache.delete(postalCache.keys().next().value);postalCache.set(pin,{result,until:Date.now()+900000});return result;
 }catch(e){
  if(ncrPrefix){
   const result={...base,productDelivery:'available_preliminary',makeover:'unavailable',localities:[],message:'PIN looks like Delhi NCR. Address verification will confirm coverage at checkout. You can continue.',source:'prefix_fallback'};
   postalCache.set(pin,{result,until:Date.now()+300000});return result;
  }
  throw e;
 }
}
async function reverseLocation(point,pin,env,fetcher){if(!validPoint(point))throw new CoverageError('Select a valid map location.',400);const u=new URL(config.geocoding.endpoint.replace('findAddressCandidates','reverseGeocode'));u.search=new URLSearchParams({location:point.lng+','+point.lat,f:'json',langCode:'en'}).toString();const data=await providerJson(u,env,fetcher),a=data.address||{},country=a.CountryCode||a.Country;const matched={lat:data.location?.y,lng:data.location?.x};if(a.Postal!==pin||!validPoint(matched)||distanceKm(point,matched)>config.geocoding.addressMatchToleranceKm||country!=='IND')throw new CoverageError('We could not verify this map location and PIN. Enter your complete address instead.');return {region:a.Region,district:a.Subregion,country};}
const cache=new Map();
export async function geocodeAddress(address,pin,env={},fetcher=fetch){
 preliminary(pin);if(typeof address!=='string'||address.trim().length<15||address.length>600)throw new CoverageError('Enter your complete address, including building, street and locality.',400);
 const key=address.trim().toLowerCase()+'|'+pin,hit=cache.get(key);if(hit&&hit.until>Date.now())return hit.results;
 const u=new URL(config.geocoding.endpoint);u.search=new URLSearchParams({SingleLine:address.trim(),sourceCountry:'IND',outFields:'Addr_type,Type,LongLabel,Postal,Region,Subregion,Country,City',maxLocations:'5',f:'json'}).toString();
 const apiKey=env.ARCGIS_GEOCODING_API_KEY;if(apiKey)u.searchParams.set('token',apiKey);
 let data;try{const r=await fetcher(u,{signal:AbortSignal.timeout(9000)});if(!r.ok)throw Error();data=await r.json();if(data.error)throw Error();}catch{throw new CoverageError('Address search is temporarily unavailable. Please try again shortly.',503);}
 const results=(data.candidates||[]).filter(c=>c.score>=config.geocoding.minimumScore&&config.geocoding.allowedAddressTypes.includes(c.attributes?.Addr_type)&&c.attributes?.Country==='IND'&&c.attributes.Postal===pin).map(c=>({label:c.attributes.LongLabel||c.address,lat:c.location.y,lng:c.location.x,score:c.score,addressType:c.attributes.Addr_type,admin:{region:c.attributes.Region,district:c.attributes.Subregion,country:c.attributes.Country}})).filter(validPoint);
 if(!results.length)throw new CoverageError('We could not confidently match this complete address and PIN. Please check the building, street, locality and PIN in your address.',422);
 if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,{results,until:Date.now()+600000});return results;
}
export async function resolveCoverage(input,env={},fetcher=fetch){
 if(!input||typeof input!=='object')throw new CoverageError('Enter your PIN and location.',400);
 if(input.customer){return validateDeliveryAddress(input.customer,input,false,env,fetcher);}
 if(input.location){if(input.locationConfirmed!==true)throw new CoverageError('Confirm that the map pin marks your delivery or installation address.',400);return evaluateLocation(input.location,input.pin,await reverseLocation(input.location,input.pin,env,fetcher));}
 if(input.address){const candidates=await geocodeAddress(input.address,input.pin,env,fetcher);return {...preliminary(input.pin),level:'address_candidates',candidates,message:'Select the matching address, check the map pin and confirm it.'};}
 return checkPostal(input.pin,env,fetcher);
}
export function enforceCoverage(customer,selection,installationRequired=false,admin){
 deliveryAddress(customer);
 if(!selection||selection.locationConfirmed!==true||selection.pin!==customer.pin)throw new CoverageError('Please confirm the matching address location before submitting.');
 if(normalize(customer.state)!==normalize(admin?.region))throw new CoverageError('The verified address does not match the state in Delivery details.');
 const result=evaluateLocation(selection.location,customer.pin,admin);if(result.productDelivery!=='available')throw new CoverageError(result.message);if(installationRequired&&result.makeover!=='available')throw new CoverageError(config.deliveryOnlyMessage);return result;
}
export function itemNeedsInstallation(p){return p.fulfilmentMode==='installation-required'||p.requiresInstallation===true;}

export function deliveryAddress(customer){
 if(!customer||typeof customer.address!=='string'||customer.address.trim().length<8)throw new CoverageError('Please enter your complete building and street address.',400);
 if(!customer.city||!Object.keys(config.deliveryTerritory.regions).includes(customer.state))throw new CoverageError('Please use a complete delivery address within Delhi NCR.');
 return [customer.address,customer.area,customer.city,customer.state,customer.pin].filter(Boolean).join(', ');
}
// Never trust client eligibility flags or an unrelated point supplied with an address.
export async function validateDeliveryAddress(customer,selection,installationRequired=false,env={},fetcher=fetch){
 const address=deliveryAddress(customer),candidates=await geocodeAddress(address,customer.pin,env,fetcher),point=candidates[0];
 if(candidates.some(p=>distanceKm(p,point)>config.geocoding.addressMatchToleranceKm))throw new CoverageError('We found more than one possible delivery location. Please add your building name, street and locality to Delivery details.');
 if(selection&&(!selection.locationConfirmed||selection.pin!==customer.pin||!validPoint(selection.location)||!candidates.some(p=>distanceKm(p,selection.location)<=config.geocoding.addressMatchToleranceKm)))throw new CoverageError('The selected map pin does not match your delivery address.');
 const coverage=enforceCoverage(customer,{pin:customer.pin,location:point,locationConfirmed:true},installationRequired,point.admin);
 return {...coverage,addressValidated:true,locationSource:'delivery-address'};
}

// A PIN-only consultation is an enquiry, never confirmed installation coverage.
export async function consultationPinCoverage(pin,env={},fetcher=fetch){const postal=await checkPostal(pin,env,fetcher);if(postal.productDelivery!=='available_preliminary')throw new CoverageError('Please use a verified serviceable Delhi NCR PIN code.');return {...postal,makeover:'pending_confirmation',installationConfirmed:false};}
