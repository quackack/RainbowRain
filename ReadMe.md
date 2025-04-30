#Rainbow Rain

Welcome to rainbow rain, a quick project made over a couple of
weeks to familiarize myself with webgl. Rainbow rain is a simple, realtime
weather erosion of terrain by, well, essentially pelting it with many small
rocks.

#How to Run

To run, simply download and open index.html. To move, use w,a,s,d,q, and e. To move
the camera, use i,j,k, and l.

#How does it work.

Very briefly, we store the hills in a height map. That is, a texture where the red
component is the height. The initial hill is a fractal rendered
using a shader. Similarly, all the positions of the drops and their velocities are
also stored in textures. Then we use shaders to update the positions and velocities
of the drops, as well as the heights in the height map.

All of this is rendered using webgl2 with a few common extensions, most notably custom
blend modes and the ability to render to floating point buffers.

#Any Further Plans?

A few more features I would like to add:

1. More drops! The current number of drops is smaller than I want and this is mostly
do to a size limitation on textures. BUT we only encounter the size limitation so fast
because we are using a 1d texture. If I use a 2d texture, I should be able to fit more.
2. Better drops. Ideally the drops are rainbow colors, and I would like to change the
drop material to be a round cutout rather than the current, basic hexagon. Perhaps
even make them translucent (probably have them add their color to the scene).
3. Less importantly, this could have some performance improvements. It was very unoptimized.
We could also clean up a lot of the code using a better webgl library, like twgl.


#Any Less Likely Updates.

If I get time, there are two more big changes I would like to make.
1. Ideally I want to make all the drops glow. For performance reasons, this would require
me changing to a deferred rendering approach. However, this likely wouldn't be too bad
as I really only need to change the renderer on the terrain. In fact, this was my original idea
and why I called it rainbow rain.
2. Implement some basic fluid dynamics. Nothing too crazy, I essentially want nearby drops
to push on each other. Of course, doing an all particle to all particle interaction would
be insane. Instead, we should render to an additional texture for every drop to estimate
the density of drops in an area, this would correspond to pressure, and the gradient of this
pressure map would add a force. Of course, this isn't a super accurate way to model fluids,
but it is likely enough to make the simulation work better. I hope. My guess is that even
this basic idea will require quite a bit of fudging to get to work.

3. Alternatively, I could add a "Heat" parameter to the terrain to make parts of the terrain
that have been hit more recently be "warmer" and repulse balls away from it harder. This might
give a similar effect as pressure with less computational overhead.