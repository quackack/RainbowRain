const shadeMac = {
    heightNorm: `
    float getHeight(vec2 pos, sampler2D heightMap) {
        vec2 uv = 0.5 + 0.5* pos;
        return texture2D(heightMap, uv).r;
    }
    vec2 getSlope(vec2 pos, float coordDif, sampler2D heightMap) {
        return vec2(getHeight(vec2(pos.x + coordDif, pos.y), heightMap) - getHeight(vec2(pos.x - coordDif, pos.y), heightMap),
        getHeight(vec2(pos.x, pos.y + coordDif), heightMap) - getHeight(vec2(pos.x, pos.y - coordDif), heightMap)) / coordDif;
    }
    vec3 getNorm(vec2 pos, float coordDif, sampler2D heightMap) {
      vec2 slope = getSlope(pos, coordDif, heightMap);
      float slopeSquared = dot(slope, slope);
      float slopeMag = sqrt(slopeSquared);
      
      float normalizedRun = sqrt(1.0/(1.0+slopeSquared));
      
      //Here is the full calculation, simplify this to get the formula we actually use.
      //float normalizedRise = slopeMag*normalizedRun;
      //vec2 slopeDir = - slope / slopeMag;
      //vec2 normalHorizontal = slopeDir*normalizedRise;
      vec2 normalHorizontal = - slope * normalizedRun;
      return vec3(normalHorizontal.x, normalizedRun, normalHorizontal.y);
    }
    `,
    heightNormGLES3: `
    float getHeight(vec2 pos, sampler2D heightMap) {
        vec2 uv = 0.5 + 0.5* pos;
        return texture(heightMap, uv).r;
    }
    vec2 getSlope(vec2 pos, float coordDif, sampler2D heightMap) {
        return vec2(getHeight(vec2(pos.x + coordDif, pos.y), heightMap) - getHeight(vec2(pos.x - coordDif, pos.y), heightMap),
        getHeight(vec2(pos.x, pos.y + coordDif), heightMap) - getHeight(vec2(pos.x, pos.y - coordDif), heightMap)) / coordDif;
    }
    vec3 getNorm(vec2 pos, float coordDif, sampler2D heightMap) {
      vec2 slope = getSlope(pos, coordDif, heightMap);
      float slopeSquared = dot(slope, slope);
      float slopeMag = sqrt(slopeSquared);
      
      float normalizedRun = sqrt(1.0/(1.0+slopeSquared));
      
      //Here is the full calculation, simplify this to get the formula we actually use.
      //float normalizedRise = slopeMag*normalizedRun;
      //vec2 slopeDir = - slope / slopeMag;
      //vec2 normalHorizontal = slopeDir*normalizedRise;
      vec2 normalHorizontal = - slope * normalizedRun;
      return vec3(normalHorizontal.x, normalizedRun, normalHorizontal.y);
    }
    `
};