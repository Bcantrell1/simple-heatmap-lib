document.addEventListener('DOMContentLoaded', function () {
  //Setup Canvas
  let canvas = document.querySelector('#heatCanvas');
  const context = canvas.getContext('2d');
  let heat = {};
  let renderStartTime;
  const worker = new Worker('render_worker.js');

  worker.onmessage = (event) => {
    renderHeat(JSON.parse(event.data).heat);
    document.querySelector('#render-time .time').textContent = ((new Date().getTime() - renderStartTime) / 1000);
    renderStartTime = 0;
    document.querySelector('button').removeAttribute('disabled');
    document.querySelector('#collect-data').removeAttribute('disabled');
  };

  /* Masks for different events */
  const mousemoveMask = [
    [0, 1, 0],
    [1, 2, 1],
    [0, 1, 0]
  ];

  const clickMask = [
    [0, 1, 2, 1, 0],
    [1, 2, 4, 2, 1],
    [1, 4, 5, 4, 2],
    [1, 2, 4, 2, 1],
    [0, 1, 2, 1, 0]
  ];

  const canvasWidth = canvas.width = parseFloat(getComputedStyle(document.querySelector('#trackme'), null).width.replace("px", ""));
  const canvasHeight = canvas.height = parseFloat(getComputedStyle(document.querySelector('#trackme'), null).height.replace("px", ""));

  const applyMask = function (mask, eventX, eventY) {
    let key, i, j, initialI, initialJ, maskSeg;

    maskSeg = Math.floor(mask.length / 2);

    initialI = eventX - maskSeg;
    initialJ = eventY - maskSeg;

    for (i = initialI; i <= eventX + maskSeg; i += 1) {
      if (i < 0 || i >= canvasWidth) {
        continue;
      }

      for (j = initialJ; j <= eventY + maskSeg; j += 1) {
        if (j < 0 || j >= canvasHeight) {
          continue;
        }

        key = i + "," + j;
        heat[key] = heat[key] || 0;
        heat[key] += mask[i - initialI][j - initialJ];
      }
    }
  };

  document.querySelector('#trackme:not(.disabled)').addEventListener('click', event => {
    const offsetLeft = document.querySelector('#trackme:not(.disabled)').offsetParent.offsetLeft;
    const offsetTop = document.querySelector('#trackme:not(.disabled)').offsetParent.offsetTop;
    const offset = {
      top: offsetTop,
      left: offsetLeft
    }
    applyMask(clickMask, event.pageX - offset.left, event.pageY - offset.top);
  })


  const renderHeat = (heat) => {
    let rgb;
    const heatData = Object.entries(heat);
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    for (let i = 0; i < heatData.length; i++) {
      const key = heatData[i][0].split(',');
      const value = heatData[i][1];

      rgb = hueToRGB(toHue(value), 1, 1);

      context.beginPath();
      context.fillStyle = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
      context.arc(key[0], key[1], 1, 0, Math.PI * 2, true);
      context.fill();
      context.closePath();


    }
    fadeIn(canvas);
  };

  const dumpHeat = (heat) => {
    let val = '{\n ';

    const heatData = Object.entries(heat);

    for (let i = 0; i < heatData.length; i++) {
      const k = heatData[i][0];
      const v = heatData[i][1];
      if (v !== 0) {
        val += ` ${k}: ${v}, \n `;
      }
    }
    //Remove comma to format object
    if (isEmptyObject(heat)) {
      val = val.substring(0, val.length - 1);
    }

    val += "\n}\n";
    document.querySelector('#data-output').textContent = val;
  };

  /*Creating a Hue for hot and cold Hot: 0 Cold: 255 */

  let cache = {
    toHue: {},
    hueToRGB: {}
  };

  const toHue = (value) => {
    if (cache.toHue[value]) {
      return cache.toHue[value];
    }
    cache.toHue[value] = 240 - Math.floor((value * 240) / 255);

    return cache.toHue[value];
  };


  /*Convert HSV to RGB*/
  const hueToRGB = (h, s, v) => {
    let r, g, b,
      i,
      f, p, q, t,
      cachekey = h + "/" + s + "/" + v;

    if (cache.hueToRGB[cachekey]) {
      return cache.hueToRGB[cachekey];
    }

    // Make sure our arguments stay in-range
    h = Math.max(0, Math.min(360, h));
    s = Math.max(0, Math.min(1, s));
    v = Math.max(0, Math.min(1, v));

    if (s === 0) {
      // Achromatic (grey)
      r = g = b = v;
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    h /= 60; // sector 0 to 5
    i = Math.floor(h);
    f = h - i; // factorial part of h
    p = v * (1 - s);
    q = v * (1 - s * f);
    t = v * (1 - s * (1 - f));

    switch (i) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;

      case 1:
        r = q;
        g = v;
        b = p;
        break;

      case 2:
        r = p;
        g = v;
        b = t;
        break;

      case 3:
        r = p;
        g = q;
        b = v;
        break;

      case 4:
        r = t;
        g = p;
        b = v;
        break;

      default:
        r = v;
        g = p;
        b = q;
    }

    cache.hueToRGB[cachekey] = [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    return cache.hueToRGB[cachekey];
  };



  document.querySelector('#trackme:not(.disabled)').addEventListener('mousemove', event => {
    const offsetLeft = document.querySelector('#trackme:not(.disabled)').offsetParent.offsetLeft;
    const offsetTop = document.querySelector('#trackme:not(.disabled)').offsetParent.offsetTop;
    const offset = {
      top: offsetTop,
      left: offsetLeft
    }
    applyMask(mousemoveMask, event.pageX - offset.left, event.pageY - offset.top);
  });

  document.querySelector('.render-button').addEventListener('click', e => {
    let smoothing = document.querySelector('#do-render');
    document.querySelector('button').setAttribute('disabled', true);
    document.querySelector('#trackme').setAttribute('disabled', true);
    renderStartTime = new Date().getTime();

    worker.postMessage(JSON.stringify({
      heat: heat,
      width: canvasWidth,
      height: canvasHeight,
      smoothing: smoothing
    }));
    dumpHeat(heat);
  });

  //Reset Canvas and user interaction data 
  document.querySelector('#clear-data').addEventListener('click', e => {
    heat = {};
    document.querySelector('#render-time .time').textContent = 0;
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    dumpHeat(heat);
  });

  //
  document.querySelector('#collect-data').addEventListener('click', e => {
    document.querySelector('#collect-data').setAttribute('disabled', true);
    document.querySelector('#trackme').removeAttribute('disabled');
    fadeOut(canvas);
  });

});

/*Helper functions*/
const fadeOut = (el) => {
  el.style.opacity = 1;

  (fade = () => {
    if ((el.style.opacity -= .1) <= 0) {
      el.style.display = "none";
    } else {
      requestAnimationFrame(fade);
    }
  })();
};

const fadeIn = (el, display) => {
  el.style.opacity = 0;
  el.style.display = display || "block";

  (fade = () => {
    var val = parseFloat(el.style.opacity);
    if (!((val += .1) >= 1)) {
      el.style.opacity = val;
      requestAnimationFrame(fade);
    }
  })();
};

const isEmptyObject = (obj) => {
  for (let prop in obj) {
    if (obj.hasOwnProperty(prop))
      return false;
  }

  return true;
}