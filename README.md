# Chance

Various simulations of chance-related physical objects. Serves as a
playground for rendering techniques.

Supports desktop and mobile browsers. Optimised for iOS and can be
added to the home screen.

## Screens

### Dice

<img src="screenshots/dice-small.png" alt="Dice preview" width="200" align="right" />

Rigid-body-physics simulation with custom WebGL shaders defining the
dice shapes and reflections.

* Uses [GoblinPhysics](https://github.com/chandlerprall/GoblinPhysics)
  for the physics simulation
* Seeds dice with uniform random rotations to ensure randomness
* Variety of dice materials, shapes and faces
  - Wood (varnished, unvarnished and unpainted)
  - Plastic (white and red)
  - Sharp square / Smooth square / Truncated square / Rounded square
  - Dots (European and Asian style) / Numbers / Words
* Uses normal mapping and parallax mapping on the dice faces for
  realistic dot rendering
* Uses raytracing to render rounded dice shapes
* Sharp shadows beneath dice
* No rendering while stationary for energy saving

### Coins

<img src="screenshots/coins-small.png" alt="Coins preview" width="200" align="right" />

Animated coin toss with raytraced coin.

* Uses normal mapping and parallax mapping to render coin faces
* Uses a bespoke radial parallax mapping technique to render grooves
  and shapes around the edges
* Losely physics-based animation which runs independently of random
  coin characteristics (outcome and final rotation)
* Motion blur during animation
* Blurred shadow beneath coin
* No rendering while stationary for energy saving

### Numbers

Work in progress.

### Contortion

<img src="screenshots/contortion-small.png" alt="Contortion preview" width="200" align="right" />

Simple friction simulation with WebGL used to render a motion-blurred
needle.

* Picks a target segment in advance, allowing the spinner to avoid
  states which have already been chosen
* Calculates initial velocity required to reach target state
* When flicked by hand, ensures roughly the correct number of spins
  are seen to make it feel more closely related to how much force the
  user imparted
* WebGL rendering allows cheap and realistic motion blur
* No rendering while stationary for energy saving

### Answers Ball

<img src="screenshots/answers-small.png" alt="Answers Ball preview" width="200" align="right" />

Icosahedron-inside-cylinder simulation rendered using WebGL with custom
fog simulating coloured liquid.

* Uses accelerometer and gyroscope readings if available for realistic
  movement
* When out of sight, applies uniform random rotation to icosahedron to
  ensure randomness
* Layer-based volumetric rendering allows realistic appearance; letters
  are raised above icosahedron surface and colouring is provided
  entirely by distance from the camera (liquid depth)
* No rendering while stationary or out-of-sight for energy saving

## Running Locally

Due to the use of web modules, this project cannot be served from the
filesystem directly; a web server must be used. A simple example:

```
npm install -g http-server;
http-server . -p 8080 -o;
```

Also note that as this project uses git modules, you should clone
with the `--recursive` flag (or run the following if you cloned
without it):

```bash
git submodule update --init --recursive
```
