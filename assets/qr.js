/* Dibuja el QR con puntos redondos, ojos redondeados y la "i" del logo en el centro.
   Usa qrcode-generator (cargado antes) solo para calcular la matriz. */
(function () {
  // Nivel Q: tolera ~25 % de daño, suficiente para el emblema del centro sin agrandar tanto el QR
  var NIVEL = 'Q';
  var ZONA = 4; // margen blanco de 4 módulos, lo que pide la norma para que lea bien

  // Centros de los patrones de alineación según la norma (misma fórmula que usan los generadores de referencia)
  function centrosAlineacion(version, n) {
    if (version === 1) return [];
    var cantidad = Math.floor(version / 7) + 2;
    var paso = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (cantidad * 2 - 2)) * 2;
    var pos = [6];
    for (var p = n - 7; pos.length < cantidad; p -= paso) pos.splice(1, 0, p);
    var centros = [];
    pos.forEach(function (a) {
      pos.forEach(function (b) {
        var chocaConOjo = (a === 6 && b === 6) || (a === 6 && b === n - 7) || (a === n - 7 && b === 6);
        if (!chocaConOjo) centros.push([a, b]);
      });
    });
    return centros;
  }

  function generar(texto) {
    var qr = qrcode(0, NIVEL);
    qr.addData(texto);
    qr.make();
    var n = qr.getModuleCount();
    var version = (n - 17) / 4;
    var t = n + ZONA * 2;
    // Desde la versión 7 hay un patrón de alineación en el centro: ahí no se pone emblema
    var L = version <= 6 ? (Math.floor(n * 0.22) | 1) : 0;
    var ini = (n - L) / 2;
    var alineacion = centrosAlineacion(version, n);
    var formas = [{ k: 'rect', x: 0, y: 0, w: t, h: t, rx: 0, rol: 'fondo' }];

    function esOjo(f, c) { return (f < 7 && c < 7) || (f < 7 && c >= n - 7) || (f >= n - 7 && c < 7); }
    function esAlineacion(f, c) {
      return alineacion.some(function (a) { return Math.abs(f - a[0]) <= 2 && Math.abs(c - a[1]) <= 2; });
    }

    for (var f = 0; f < n; f++) {
      for (var c = 0; c < n; c++) {
        if (!qr.isDark(f, c) || esOjo(f, c) || esAlineacion(f, c)) continue;
        if (L && f >= ini && f < ini + L && c >= ini && c < ini + L) continue;
        formas.push({ k: 'circ', x: c + ZONA + 0.5, y: f + ZONA + 0.5, r: 0.45, rol: 'modulo' });
      }
    }
    [[0, 0], [0, n - 7], [n - 7, 0]].forEach(function (p) {
      var x = p[1] + ZONA, y = p[0] + ZONA;
      formas.push({ k: 'marco', x: x + 0.5, y: y + 0.5, w: 6, h: 6, rx: 1.8, rol: 'ojo' });
      formas.push({ k: 'rect', x: x + 2, y: y + 2, w: 3, h: 3, rx: 0.9, rol: 'ojo' });
    });
    // Los patrones de alineación van sólidos: con puntos sueltos algunos lectores no los encuentran
    alineacion.forEach(function (a) {
      var x = a[1] - 2 + ZONA, y = a[0] - 2 + ZONA;
      formas.push({ k: 'marco', x: x + 0.5, y: y + 0.5, w: 4, h: 4, rx: 1.1, rol: 'ojo' });
      formas.push({ k: 'circ', x: x + 2.5, y: y + 2.5, r: 0.5, rol: 'ojo' });
    });
    if (L) {
      var e = ini + ZONA;
      formas.push({ k: 'rect', x: e + L * 0.36, y: e + L * 0.44, w: L * 0.28, h: L * 0.42, rx: L * 0.06, rol: 'emblema' });
      formas.push({ k: 'circ', x: e + L / 2, y: e + L * 0.25, r: L * 0.14, rol: 'punto' });
    }
    return { t: t, formas: formas };
  }

  function colores() {
    var s = getComputedStyle(document.documentElement);
    var primario = s.getPropertyValue('--primario').trim() || '#102070';
    return {
      fondo: '#FFFFFF',
      modulo: primario,
      ojo: primario,
      emblema: primario,
      punto: s.getPropertyValue('--punto').trim() || '#FDD919'
    };
  }

  function redondeado(g, x, y, w, h, r) {
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function aCanvas(q, col, px) {
    var lienzo = document.createElement('canvas');
    lienzo.width = lienzo.height = px;
    var g = lienzo.getContext('2d');
    var s = px / q.t;
    q.formas.forEach(function (o) {
      g.fillStyle = g.strokeStyle = col[o.rol];
      g.beginPath();
      if (o.k === 'circ') {
        g.arc(o.x * s, o.y * s, o.r * s, 0, Math.PI * 2);
        g.fill();
      } else {
        redondeado(g, o.x * s, o.y * s, o.w * s, o.h * s, o.rx * s);
        if (o.k === 'marco') { g.lineWidth = s; g.stroke(); } else { g.fill(); }
      }
    });
    return lienzo;
  }

  function n3(v) { return Math.round(v * 1000) / 1000; }

  function aSVG(q, col) {
    var cuerpo = q.formas.map(function (o) {
      if (o.k === 'circ') {
        return '<circle cx="' + n3(o.x) + '" cy="' + n3(o.y) + '" r="' + n3(o.r) + '" fill="' + col[o.rol] + '"/>';
      }
      var base = '<rect x="' + n3(o.x) + '" y="' + n3(o.y) + '" width="' + n3(o.w) + '" height="' + n3(o.h) + '" rx="' + n3(o.rx) + '"';
      return o.k === 'marco'
        ? base + ' fill="none" stroke="' + col[o.rol] + '" stroke-width="1"/>'
        : base + ' fill="' + col[o.rol] + '"/>';
    }).join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + q.t + ' ' + q.t + '" width="1024" height="1024">' + cuerpo + '</svg>';
  }

  function bajar(blob, nombre) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  window.TarjetaQR = { generar: generar, colores: colores, aCanvas: aCanvas, aSVG: aSVG, bajar: bajar };
})();
