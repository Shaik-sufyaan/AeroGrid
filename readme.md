# Physics of the Aritificial Force Fields based Geofencing:

- 3D unsigned distance field (SDF)
  - Voxel grid, cell h ≈ 2 m; value D(x) = min distance to all building AABBs.
  - Sampling: trilinear interpolation of 8 neighboring voxels.
  - Gradient: central differences
    - $∂D/∂x ≈ [D(x+he_x) − D(x−he_x)]/(2h)$, similarly for y,z
    - $n(x) = ∇D/||∇D||$ (outward normal)

- Repulsive artificial potential and force
  - Cutoff r0 ≈ 25 m, epsilon ε ≪ 1
  - $s(d) = 1/(d+ε) − 1/r0$ for d < r0, else 0
  - $U(d) = 0.5 η s(d)^2$
  - Force magnitude: mag(d) = η s(d)/(d+ε)^2, clamped to Fmax
  - Repulsion: $Frep(x) = mag(D(x)) n(x)$

- Roof landing funnel (gating)
  - For landable roofs: $Δy = y −$ hroof, $r = √((x−cx)^2+(z−cz)^2) $, $rp =$ pad radius
  - smoothstep $(a,b,t) = t^2(3−2t)$, where $t = $ clamp $((t−a)/(b−a),0,1)$
  - Gate: g = 1 − smoothstep(0,hgate,Δy) · smoothstep(0,rp,rp−r)
  - Gated force: $F = g · F_{rep}$

- Motion integration (per frame)
  - User input acceleration a_in applied in heading frame
  - Velocity damping (discrete): v ← v · λ, λ ≈ 0.95
  - Repulsive field added: v ← v + Frep (per-frame; strong effect)
  - Position: x ← x + v·dt
  - Bounds: x,z clamped to [−180,180]; y clamped to [2,80]

- AABB collision (hard contact)
  - If inside an AABB, push out along minimal-penetration axis; zero the corresponding velocity component

- Predictive trajectory preview
  - Rollout for T ≈ 3 s with step dt ≈ 0.1:
    - $v_{k+1} = (v_k + a_in·dt)·λ + Frep(x_k)$
    - $x_{k+1} = x_k + v_{k+1}·dt$
  - Points rendered as a line

# Visualization:

- Force-field “red fog” visualization
  - Sample S = ||Frep(x)|| on a sparse 3D lattice
  - Opacity α = saturate((S − Smin)/(Smax − Smin)); hard cutoff below Smin
  - Color ramp toward red with increasing S

- Legacy geofence lines (visual)
  - 2D height map by raycasting down to city meshes; binary occupancy dilated by a buffer; cell-edge contours rendered as red lines