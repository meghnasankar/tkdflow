# Lesson character: source and licence

`avatar-v2.json` and `avatar-v2.bin` are the 3D lesson character used by every lesson and by the forms-library thumbnails.

- **Base model:** Blender Studio, *Human Base Meshes* v1.4.1, the realistic female base mesh and its eye meshes.
  - Licence: CC0 1.0 (public domain dedication), https://creativecommons.org/publicdomain/zero/1.0/
  - Source: https://www.blender.org/download/demo-files/ (asset bundle `human-base-meshes-bundle-v1.4.1.zip`, SHA-256 `811f43accbb31a88266d932f8f5563b2d13586fca0ba2693aad1f5fe582b3515`).
- **What was kept:** only the head and neck, the hands from the wrist, and the feet below the trouser hem. Every other body vertex was deleted. The character is always fully clothed in a white dobok with a black V collar and a black belt.
- **What was added:** the dobok jacket and trousers, the belt with its knot and tails ("Sankar" on one tail; the emblem and two gold bars on the other, drawn at runtime as on the earlier character), hair, brows and eyes.
- **No photograph** is used on the face or anywhere else.
- **Fallback:** if this asset can't be loaded, the lesson shows the earlier procedural character (`js/animation/avatar.js`).

The build steps and the checks that guard this asset are described in `tools/avatar/README.md` in the source repository.
