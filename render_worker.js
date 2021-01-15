(() => {

  onmessage = (e) => {
    const data = JSON.parse(e.data);
    canvasWidth = data.width;
    canvasHeight = data.height;
    const heatData = data.smoothing ? initialHeat(smoothGaussian(data.heat)) : initialHeat(data.heat);
    postMessage(JSON.stringify({
      heat: heatData
    }));
  };

  /*
  Smoothed heat values
  */
  const smoothGaussian = (heat) => {
    const gaussian = [
      [2, 4, 5, 4, 2],
      [4, 9, 12, 9, 4],
      [5, 12, 15, 12, 5],
      [4, 9, 12, 9, 4],
      [2, 4, 5, 4, 2]
    ];
    const smoothedHeatObject = {};

    for (let x = 0; x < canvasWidth; x += 1) {
      for (let y = 0; y < canvasHeight; y += 1) {
        result = 0;
        for (let i = x - 2; i <= x + 2; i += 1) {
          if (i < 0 || i >= canvasWidth) {
            continue;
          }

          for (let j = y - 2; j <= y + 2; j += 1) {
            if (j < 0 || j >= canvasHeight) {
              continue;
            }

            const heatVal = heat[i + ',' + j] || 0;
            result += heatVal * gaussian[i - (x - 2)][j - (y - 2)];
          }
        }
        if (result > 0) {
          result /= 159;
          smoothedHeatObject[x + ',' + y] = result;
        }
      }
    }
    return smoothedHeatObject;
  };

  /*
   Initial Heat Values
   */
  const initialHeat = (heat) => {
    const heatValues = [];
    const initialHeatObject = {};

    for (key in heat) {
      heatValues.push(heat[key]);
    }

    const minHeat = Math.min.apply(this, heatValues);
    const maxHeat = Math.max.apply(this, heatValues);

    const denominator = maxHeat - minHeat;

    if (denominator === 0 || denominator === -Infinity) {
      denominator = 1;
    }

    for (key in heat) {
      initialHeatObject[key] = Math.floor(255 * ((heat[key] - minHeat) / denominator));
    }

    return initialHeatObject;
  };

})();