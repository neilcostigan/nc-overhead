// Bundled airport reference. Keyed by IATA (3-letter) AND ICAO (4-letter)
// so a single lookup hits either way. ~200 airports chosen for European
// & North American coverage plus the world's busiest hubs — enough that
// "almost every callsign adsbdb returns will resolve to coords".
//
// Format: { iata, icao, name, city, country, lat, lon }
// Shared by /api/airport.js and /api/route.js for route-line drawing.

const A = [
  // ----- Nordics & Baltics -----
  ["ARN","ESSA","Stockholm Arlanda","Stockholm","SE",59.6519,17.9186],
  ["BMA","ESSB","Stockholm Bromma","Stockholm","SE",59.3544,17.9416],
  ["GOT","ESGG","Gothenburg Landvetter","Gothenburg","SE",57.6627,12.2798],
  ["MMX","ESMS","Malmö","Malmö","SE",55.5360,13.3762],
  ["LLA","ESPA","Luleå","Luleå","SE",65.5438,22.1219],
  ["UME","ESNU","Umeå","Umeå","SE",63.7918,20.2828],
  ["VST","ESOW","Stockholm Västerås","Västerås","SE",59.5894,16.6334],
  ["NYO","ESKN","Stockholm Skavsta","Nyköping","SE",58.7886,16.9122],
  ["OSL","ENGM","Oslo Gardermoen","Oslo","NO",60.1939,11.1004],
  ["BGO","ENBR","Bergen","Bergen","NO",60.2934,5.2181],
  ["TRD","ENVA","Trondheim","Trondheim","NO",63.4575,10.9239],
  ["SVG","ENZV","Stavanger","Stavanger","NO",58.8767,5.6378],
  ["CPH","EKCH","Copenhagen","Copenhagen","DK",55.6180,12.6508],
  ["AAL","EKYT","Aalborg","Aalborg","DK",57.0928,9.8492],
  ["BLL","EKBI","Billund","Billund","DK",55.7403,9.1517],
  ["HEL","EFHK","Helsinki Vantaa","Helsinki","FI",60.3172,24.9633],
  ["KEF","BIKF","Keflavík","Reykjavík","IS",63.9850,-22.6056],
  ["RIX","EVRA","Riga","Riga","LV",56.9236,23.9711],
  ["TLL","EETN","Tallinn","Tallinn","EE",59.4133,24.8328],
  ["VNO","EYVI","Vilnius","Vilnius","LT",54.6341,25.2858],

  // ----- Ireland & UK -----
  ["DUB","EIDW","Dublin","Dublin","IE",53.4213,-6.2701],
  ["ORK","EICK","Cork","Cork","IE",51.8413,-8.4911],
  ["SNN","EINN","Shannon","Shannon","IE",52.7019,-8.9248],
  ["NOC","EIKN","Ireland West Knock","Charlestown","IE",53.9103,-8.8181],
  ["WAT","EIWT","Waterford","Waterford","IE",52.1872,-7.0869],
  ["LHR","EGLL","London Heathrow","London","GB",51.4700,-0.4543],
  ["LGW","EGKK","London Gatwick","London","GB",51.1481,-0.1903],
  ["STN","EGSS","London Stansted","London","GB",51.8849,0.2350],
  ["LTN","EGGW","London Luton","Luton","GB",51.8747,-0.3683],
  ["LCY","EGLC","London City","London","GB",51.5053,0.0553],
  ["MAN","EGCC","Manchester","Manchester","GB",53.3537,-2.2750],
  ["BHX","EGBB","Birmingham","Birmingham","GB",52.4539,-1.7480],
  ["EDI","EGPH","Edinburgh","Edinburgh","GB",55.9500,-3.3725],
  ["GLA","EGPF","Glasgow","Glasgow","GB",55.8642,-4.4332],
  ["NCL","EGNT","Newcastle","Newcastle","GB",55.0375,-1.6917],
  ["BRS","EGGD","Bristol","Bristol","GB",51.3827,-2.7191],
  ["EXT","EGTE","Exeter","Exeter","GB",50.7344,-3.4139],
  ["BFS","EGAA","Belfast Intl","Belfast","GB",54.6575,-6.2158],
  ["BHD","EGAC","Belfast City","Belfast","GB",54.6181,-5.8725],
  ["LBA","EGNM","Leeds Bradford","Leeds","GB",53.8659,-1.6603],
  ["LPL","EGGP","Liverpool","Liverpool","GB",53.3336,-2.8497],
  ["INV","EGPE","Inverness","Inverness","GB",57.5425,-4.0475],
  ["JER","EGJJ","Jersey","Saint Helier","GB",49.2079,-2.1955],
  ["IOM","EGNS","Isle of Man","Castletown","IM",54.0833,-4.6239],
  ["CWL","EGFF","Cardiff","Cardiff","GB",51.3967,-3.3433],
  ["SOU","EGHI","Southampton","Southampton","GB",50.9503,-1.3568],

  // ----- Western Europe -----
  ["AMS","EHAM","Amsterdam Schiphol","Amsterdam","NL",52.3086,4.7639],
  ["BRU","EBBR","Brussels","Brussels","BE",50.9014,4.4844],
  ["CRL","EBCI","Brussels Charleroi","Charleroi","BE",50.4592,4.4538],
  ["LUX","ELLX","Luxembourg","Luxembourg","LU",49.6266,6.2115],
  ["CDG","LFPG","Paris CDG","Paris","FR",49.0097,2.5479],
  ["ORY","LFPO","Paris Orly","Paris","FR",48.7233,2.3794],
  ["NCE","LFMN","Nice","Nice","FR",43.6584,7.2159],
  ["LYS","LFLL","Lyon","Lyon","FR",45.7256,5.0811],
  ["MRS","LFML","Marseille","Marseille","FR",43.4393,5.2214],
  ["TLS","LFBO","Toulouse","Toulouse","FR",43.6293,1.3638],
  ["BOD","LFBD","Bordeaux","Bordeaux","FR",44.8283,-0.7156],
  ["NTE","LFRS","Nantes","Nantes","FR",47.1532,-1.6109],
  ["FRA","EDDF","Frankfurt","Frankfurt","DE",50.0379,8.5622],
  ["MUC","EDDM","Munich","Munich","DE",48.3538,11.7861],
  ["BER","EDDB","Berlin Brandenburg","Berlin","DE",52.3667,13.5033],
  ["DUS","EDDL","Düsseldorf","Düsseldorf","DE",51.2895,6.7668],
  ["HAM","EDDH","Hamburg","Hamburg","DE",53.6304,9.9883],
  ["STR","EDDS","Stuttgart","Stuttgart","DE",48.6899,9.2219],
  ["CGN","EDDK","Cologne/Bonn","Cologne","DE",50.8659,7.1427],
  ["HAJ","EDDV","Hannover","Hannover","DE",52.4611,9.6850],
  ["VIE","LOWW","Vienna","Vienna","AT",48.1103,16.5697],
  ["ZRH","LSZH","Zurich","Zurich","CH",47.4647,8.5492],
  ["GVA","LSGG","Geneva","Geneva","CH",46.2381,6.1090],
  ["BSL","LFSB","Basel/Mulhouse","Basel","CH",47.5896,7.5299],
  ["MAD","LEMD","Madrid Barajas","Madrid","ES",40.4936,-3.5668],
  ["BCN","LEBL","Barcelona","Barcelona","ES",41.2974,2.0833],
  ["PMI","LEPA","Palma de Mallorca","Palma","ES",39.5517,2.7388],
  ["AGP","LEMG","Málaga","Málaga","ES",36.6749,-4.4991],
  ["IBZ","LEIB","Ibiza","Ibiza","ES",38.8729,1.3731],
  ["VLC","LEVC","Valencia","Valencia","ES",39.4893,-0.4816],
  ["SVQ","LEZL","Seville","Seville","ES",37.4180,-5.8931],
  ["BIO","LEBB","Bilbao","Bilbao","ES",43.3011,-2.9106],
  ["TFS","GCTS","Tenerife South","Tenerife","ES",28.0445,-16.5725],
  ["LIS","LPPT","Lisbon","Lisbon","PT",38.7813,-9.1359],
  ["OPO","LPPR","Porto","Porto","PT",41.2481,-8.6814],
  ["FAO","LPFR","Faro","Faro","PT",37.0144,-7.9659],
  ["FCO","LIRF","Rome Fiumicino","Rome","IT",41.8045,12.2508],
  ["LIN","LIML","Milan Linate","Milan","IT",45.4459,9.2767],
  ["MXP","LIMC","Milan Malpensa","Milan","IT",45.6306,8.7281],
  ["VCE","LIPZ","Venice Marco Polo","Venice","IT",45.5053,12.3519],
  ["NAP","LIRN","Naples","Naples","IT",40.8860,14.2908],
  ["BLQ","LIPE","Bologna","Bologna","IT",44.5354,11.2887],
  ["CTA","LICC","Catania","Catania","IT",37.4668,15.0664],
  ["PMO","LICJ","Palermo","Palermo","IT",38.1759,13.0910],
  ["BGY","LIME","Milan Bergamo","Bergamo","IT",45.6739,9.7042],

  // ----- Eastern / Central Europe -----
  ["WAW","EPWA","Warsaw","Warsaw","PL",52.1657,20.9671],
  ["KRK","EPKK","Kraków","Kraków","PL",50.0777,19.7848],
  ["GDN","EPGD","Gdańsk","Gdańsk","PL",54.3776,18.4662],
  ["PRG","LKPR","Prague","Prague","CZ",50.1008,14.2632],
  ["BUD","LHBP","Budapest","Budapest","HU",47.4369,19.2557],
  ["OTP","LROP","Bucharest Otopeni","Bucharest","RO",44.5722,26.1022],
  ["SOF","LBSF","Sofia","Sofia","BG",42.6951,23.4060],
  ["BEG","LYBE","Belgrade","Belgrade","RS",44.8184,20.3091],
  ["ZAG","LDZA","Zagreb","Zagreb","HR",45.7429,16.0688],
  ["LJU","LJLJ","Ljubljana","Ljubljana","SI",46.2237,14.4576],
  ["ATH","LGAV","Athens","Athens","GR",37.9364,23.9445],
  ["SKG","LGTS","Thessaloniki","Thessaloniki","GR",40.5197,22.9709],
  ["IST","LTFM","Istanbul","Istanbul","TR",41.2753,28.7519],

  // ----- North America majors -----
  ["JFK","KJFK","New York JFK","New York","US",40.6398,-73.7789],
  ["EWR","KEWR","Newark","Newark","US",40.6925,-74.1687],
  ["LGA","KLGA","New York LaGuardia","New York","US",40.7773,-73.8726],
  ["BOS","KBOS","Boston","Boston","US",42.3656,-71.0096],
  ["IAD","KIAD","Washington Dulles","Washington","US",38.9445,-77.4558],
  ["DCA","KDCA","Washington Reagan","Washington","US",38.8521,-77.0377],
  ["PHL","KPHL","Philadelphia","Philadelphia","US",39.8744,-75.2424],
  ["ATL","KATL","Atlanta","Atlanta","US",33.6407,-84.4277],
  ["MIA","KMIA","Miami","Miami","US",25.7959,-80.2870],
  ["FLL","KFLL","Fort Lauderdale","Fort Lauderdale","US",26.0742,-80.1506],
  ["MCO","KMCO","Orlando","Orlando","US",28.4312,-81.3081],
  ["ORD","KORD","Chicago O'Hare","Chicago","US",41.9742,-87.9073],
  ["MDW","KMDW","Chicago Midway","Chicago","US",41.7868,-87.7522],
  ["DFW","KDFW","Dallas Fort Worth","Dallas","US",32.8998,-97.0403],
  ["IAH","KIAH","Houston","Houston","US",29.9844,-95.3414],
  ["DEN","KDEN","Denver","Denver","US",39.8617,-104.6731],
  ["SEA","KSEA","Seattle","Seattle","US",47.4502,-122.3088],
  ["SFO","KSFO","San Francisco","San Francisco","US",37.6213,-122.3790],
  ["LAX","KLAX","Los Angeles","Los Angeles","US",33.9416,-118.4085],
  ["SAN","KSAN","San Diego","San Diego","US",32.7338,-117.1933],
  ["LAS","KLAS","Las Vegas","Las Vegas","US",36.0840,-115.1537],
  ["PHX","KPHX","Phoenix","Phoenix","US",33.4343,-112.0078],
  ["YYZ","CYYZ","Toronto Pearson","Toronto","CA",43.6777,-79.6248],
  ["YUL","CYUL","Montreal","Montreal","CA",45.4658,-73.7455],
  ["YVR","CYVR","Vancouver","Vancouver","CA",49.1939,-123.1844],

  // ----- Middle East & Asia hubs -----
  ["DXB","OMDB","Dubai","Dubai","AE",25.2532,55.3657],
  ["AUH","OMAA","Abu Dhabi","Abu Dhabi","AE",24.4330,54.6511],
  ["DOH","OTHH","Doha Hamad","Doha","QA",25.2731,51.6080],
  ["IST","LTFM","Istanbul","Istanbul","TR",41.2753,28.7519],
  ["TLV","LLBG","Tel Aviv","Tel Aviv","IL",32.0114,34.8867],
  ["HKG","VHHH","Hong Kong","Hong Kong","HK",22.3080,113.9185],
  ["SIN","WSSS","Singapore Changi","Singapore","SG",1.3644,103.9915],
  ["BKK","VTBS","Bangkok Suvarnabhumi","Bangkok","TH",13.6900,100.7501],
  ["NRT","RJAA","Tokyo Narita","Tokyo","JP",35.7720,140.3929],
  ["HND","RJTT","Tokyo Haneda","Tokyo","JP",35.5494,139.7798],
  ["ICN","RKSI","Seoul Incheon","Seoul","KR",37.4691,126.4505],
  ["PEK","ZBAA","Beijing Capital","Beijing","CN",40.0799,116.6031],
  ["PVG","ZSPD","Shanghai Pudong","Shanghai","CN",31.1443,121.8083],
  ["BOM","VABB","Mumbai","Mumbai","IN",19.0896,72.8656],
  ["DEL","VIDP","Delhi","Delhi","IN",28.5562,77.1000],
  ["JNB","FAOR","Johannesburg","Johannesburg","ZA",-26.1392,28.2460],

  // ----- South America -----
  ["GRU","SBGR","São Paulo Guarulhos","São Paulo","BR",-23.4356,-46.4731],
  ["GIG","SBGL","Rio de Janeiro","Rio de Janeiro","BR",-22.8089,-43.2436],
  ["EZE","SAEZ","Buenos Aires Ezeiza","Buenos Aires","AR",-34.8222,-58.5358],
  ["SCL","SCEL","Santiago","Santiago","CL",-33.3928,-70.7858],
  ["MEX","MMMX","Mexico City","Mexico City","MX",19.4361,-99.0719],

  // ----- Oceania -----
  ["SYD","YSSY","Sydney","Sydney","AU",-33.9461,151.1772],
  ["MEL","YMML","Melbourne","Melbourne","AU",-37.6733,144.8433],
  ["BNE","YBBN","Brisbane","Brisbane","AU",-27.3842,153.1175],
  ["PER","YPPH","Perth","Perth","AU",-31.9403,115.9669],
  ["AKL","NZAA","Auckland","Auckland","NZ",-37.0081,174.7917],
];

export const AIRPORTS = Object.freeze(
  Object.fromEntries(
    A.flatMap(([iata, icao, name, city, country, lat, lon]) => {
      const v = { iata, icao, name, city, country, lat, lon };
      return [[iata, v], [icao, v]];
    })
  )
);

/** Look up an airport by IATA or ICAO code (case-insensitive). */
export function findAirport(code) {
  if (!code) return null;
  return AIRPORTS[code.toUpperCase()] || null;
}
