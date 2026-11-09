import type { ProceduralId } from '../three/procedural';

export type GroupId = 'mammals' | 'birds' | 'reptiles' | 'ocean' | 'abyss' | 'savanna';

export interface Trait {
  icon: 'ruler' | 'weight' | 'wing' | 'diet' | 'globe' | 'depth';
  label: string;
  value: string;
}

export interface Species {
  id: string;
  name: string;
  latin: string;
  family: string;
  tags: string[];
  description: string;
  traits: Trait[];
  habitat: string;
  caption: string;
  featured: { headline: string; text: string };
  closeup: { title: string; text: string; zoom: number; rotY: number; rotX: number };
  thumbnail?: { yaw?: number; pitch?: number; time?: number; fit?: number };
  groups: GroupId[];
  model: {
    url?: string;
    mobileUrl?: string;
    procedural?: ProceduralId;
    /** Locomotion style decides travel path, idle bob and shadow distance. */
    kind: 'walk' | 'fly' | 'swim';
    idleClip?: string;
    moveClip?: string;
    idleTimeScale: number;
    moveTimeScale: number;
    /** Rotation that makes the raw model face +Z. */
    forwardYaw: number;
    /** Size relative to the stage (1 = default). */
    size: number;
    /** Asset attribution (shown in the info panel). */
    credit?: { title: string; author: string; license: string; url?: string };
    /** Force-translucent material opacity (e.g. jellyfish bell). */
    opacity?: number;
    /** Whole-model squash pulse for static swimmers (e.g. jellyfish). */
    pulse?: boolean;
    /** Backdrop diorama shown behind the specimen. */
    habitat?: 'savanna' | 'forest' | 'reef' | 'abyss' | 'wetland' | 'polar';
  };
}

export const GROUPS: { id: GroupId | 'featured'; label: string }[] = [
  { id: 'featured', label: 'Featured' },
  { id: 'mammals', label: 'Mammals' },
  { id: 'birds', label: 'Birds' },
  { id: 'reptiles', label: 'Reptiles' },
  { id: 'ocean', label: 'Ocean & Reef' },
  { id: 'abyss', label: 'Deep Sea' },
  { id: 'savanna', label: 'Savanna & Steppe' },
];

export const SPECIES: Species[] = [
  {
    id: 'fox',
    name: 'Red Fox',
    latin: 'Vulpes vulpes',
    family: 'Canidae',
    tags: ['Crepuscular', 'Mouse-pouncer', 'Magnetic sense'],
    description:
      'The red fox is the most widespread wild carnivore on Earth, at home on Arctic tundra and in city parks alike. It can hear a mouse squeak under a metre of snow, then leaps high and dives nose-first to pin it.',
    traits: [
      { icon: 'ruler', label: 'Length', value: '45–90 cm, plus tail' },
      { icon: 'weight', label: 'Weight', value: '3–14 kg' },
      { icon: 'diet', label: 'Diet', value: 'Rodents, rabbits, berries and insects' },
      { icon: 'globe', label: 'Range', value: 'Across the Northern Hemisphere' },
    ],
    habitat: 'Forest edges, farmland, tundra and towns.',
    caption: 'A flame-coloured shadow that hunts with its ears.',
    featured: { headline: 'A tail like a scarf.', text: 'Wrapped around its nose on cold nights, steering it mid-leap by day.' },
    closeup: {
      title: 'Close-up Detail',
      text: 'The brush is a third of its length: a scarf in winter and a rudder mid-pounce.',
      zoom: 2.1,
      rotY: -1.9,
      rotX: 0.12,
    },
    groups: ['mammals', 'savanna'],
    model: {
      url: '/models/fox.glb',
      habitat: 'savanna',
      credit: { title: 'Fox', author: 'Quaternius', license: 'CC0', url: 'https://quaternius.com' },
      kind: 'walk',
      idleClip: 'Survey',
      moveClip: 'Run',
      idleTimeScale: 1,
      moveTimeScale: 1.1,
      forwardYaw: 0,
      size: 0.9,
    },
  },
  {
    id: 'elephant',
    name: 'African Bush Elephant',
    latin: 'Loxodonta africana',
    family: 'Elephantidae',
    tags: ['Matriarchal', 'Infrasound caller', 'Keystone engineer'],
    description:
      'The largest land animal on Earth reshapes whole landscapes, toppling trees to open grassland and digging dry-season wells other animals depend on. Families stay in touch across kilometres using low rumbles felt through the ground.',
    traits: [
      { icon: 'ruler', label: 'Height', value: '3.0–3.8 m at the shoulder' },
      { icon: 'weight', label: 'Weight', value: '4,000–7,000 kg' },
      { icon: 'diet', label: 'Diet', value: 'Grasses, bark, roots and fruit' },
      { icon: 'globe', label: 'Range', value: 'Sub-Saharan Africa' },
    ],
    habitat: 'Savanna woodland, floodplains and desert margins.',
    caption: 'Forty thousand muscles in a single trunk, gentle enough to lift a seed.',
    featured: { headline: 'Ears shaped like Africa.', text: 'Woven with blood vessels that cool up to 12 litres of blood a minute.' },
    closeup: {
      title: 'Close-up Detail',
      text: 'Two finger-like tips at the end of the trunk can pluck a single blade of grass or lift a log.',
      zoom: 2.0,
      rotY: -0.65,
      rotX: 0.14,
    },
    groups: ['mammals', 'savanna'],
    model: {
      url: '/models/elephant.glb',
      habitat: 'savanna',
      credit: { title: 'Elephant', author: 'elkiotbear', license: 'CC-BY 3.0', url: 'https://poly.pizza/m/3AfO8NwcxD' },
      kind: 'walk',
      idleTimeScale: 1,
      moveTimeScale: 1.4,
      forwardYaw: 0,
      size: 1.0,
    },
  },
  {
    id: 'giraffe',
    name: 'Reticulated Giraffe',
    latin: 'Giraffa reticulata',
    family: 'Giraffidae',
    tags: ['Seven neck vertebrae', 'Prehensile tongue', 'Coat like stained glass'],
    description:
      'Chestnut polygons framed by crisp cream lines camouflage the reticulated giraffe among sun-dappled acacia thorns. Despite its two-metre neck, it has the exact same number of neck vertebrae as a mouse: seven.',
    traits: [
      { icon: 'ruler', label: 'Height', value: '4.6–5.7 m' },
      { icon: 'weight', label: 'Weight', value: '800–1,600 kg' },
      { icon: 'diet', label: 'Diet', value: 'Acacia leaves, shoots and pods' },
      { icon: 'globe', label: 'Range', value: 'Kenya, Somalia and Ethiopia' },
    ],
    habitat: 'Acacia savanna and dry open woodland.',
    caption: 'A watchtower that browsers the treetops in silence.',
    featured: { headline: 'A 45 cm purple tongue.', text: 'Tough and dark to prevent sunburn while stripping thorny branches.' },
    closeup: {
      title: 'Close-up Detail',
      text: 'Skin-covered horns called ossicones tell a giraffe’s age and sex at a glance.',
      zoom: 2.15,
      rotY: -0.7,
      rotX: -0.18,
    },
    groups: ['mammals', 'savanna'],
    model: {
      url: '/models/giraffe.glb',
      habitat: 'savanna',
      credit: { title: 'Giraffe', author: 'Poly by Google', license: 'CC-BY 3.0', url: 'https://poly.pizza/m/0VkNrGSGXOO' },
      kind: 'walk',
      idleTimeScale: 1,
      moveTimeScale: 1.3,
      forwardYaw: 0,
      size: 1.05,
    },
  },
  {
    id: 'horse',
    name: "Przewalski's Horse",
    latin: 'Equus ferus przewalskii',
    family: 'Equidae',
    tags: ['Never domesticated', 'Herd-living', 'Reintroduced'],
    description:
      "Stocky, dun-coloured and never tamed, Przewalski's horse once vanished entirely from the wild. Bred back from a handful of zoo animals, its herds now roam the Mongolian steppe again.",
    traits: [
      { icon: 'ruler', label: 'Height', value: '1.2–1.4 m at the shoulder' },
      { icon: 'weight', label: 'Weight', value: '200–350 kg' },
      { icon: 'diet', label: 'Diet', value: 'Grasses and steppe plants' },
      { icon: 'globe', label: 'Range', value: 'Mongolia, China, Kazakhstan' },
    ],
    habitat: 'Open grassland and semi-desert steppe.',
    caption: 'Gone from the wild, then galloping back.',
    featured: { headline: 'Back from the brink.', text: 'Every one alive today descends from just twelve founders.' },
    closeup: {
      title: 'Close-up Detail',
      text: 'An upright, mohawk-like mane with no forelock, shed and regrown every spring.',
      zoom: 2.2,
      rotY: 0.35,
      rotX: 0.05,
    },
    groups: ['mammals', 'savanna'],
    model: {
      url: '/models/horse.glb',
      habitat: 'savanna',
      credit: { title: 'Horse', author: 'Quaternius', license: 'CC0', url: 'https://quaternius.com' },
      kind: 'walk',
      idleTimeScale: 0.22,
      moveTimeScale: 1,
      forwardYaw: 0,
      size: 1.05,
    },
  },
  {
    id: 'lion',
    name: 'African Lion',
    latin: 'Panthera leo',
    family: 'Felidae',
    tags: ['Pride hunter', 'Savanna guardian', 'Cooperative caller'],
    description:
      'Lions are the most social big cats, living in prides that cooperate to raise cubs, defend territory and hunt. Lionesses do much of the hunting while males help protect the pride, and their roaring chorus keeps neighbouring groups in contact.',
    traits: [
      { icon: 'ruler', label: 'Length', value: '1.7–2.5 m, excluding tail' },
      { icon: 'weight', label: 'Weight', value: '110–250 kg' },
      { icon: 'diet', label: 'Diet', value: 'Antelope, zebra, buffalo and smaller prey' },
      { icon: 'globe', label: 'Range', value: 'Sub-Saharan Africa' },
    ],
    habitat: 'Open savanna, grassland, dry woodland and scrub.',
    caption: 'A golden silhouette holding the grassland together.',
    featured: { headline: 'A roar that travels.', text: 'Pride members answer one another across the grassland, advertising presence without a confrontation.' },
    closeup: {
      title: 'A tongue like a rasp',
      text: 'Backward-pointing papillae on the tongue help a lion scrape meat from bones and groom its coat.',
      zoom: 2.1,
      rotY: -0.55,
      rotX: 0.12,
    },
    groups: ['mammals', 'savanna'],
    model: {
      url: '/models/lion.glb',
      habitat: 'savanna',
      credit: { title: 'Lion', author: 'Poly by Google', license: 'CC-BY 3.0', url: 'https://poly.pizza/m/3XAJojWxSWz' },
      kind: 'walk',
      idleTimeScale: 1,
      moveTimeScale: 1.25,
      forwardYaw: 0,
      size: 1.0,
    },
  },
  {
    id: 'tiger',
    name: 'Bengal Tiger',
    latin: 'Panthera tigris tigris',
    family: 'Felidae',
    tags: ['Solitary ambush', 'Swimming cat', 'Unrepeatable stripes'],
    description:
      'The Bengal tiger moves alone through forests, tall grass and mangroves, using striped camouflage to approach within striking distance. Each tiger carries a unique pattern, and unlike most cats it readily enters deep water to swim and cool down.',
    traits: [
      { icon: 'ruler', label: 'Length', value: '2.4–3.1 m, including tail' },
      { icon: 'weight', label: 'Weight', value: '100–260 kg' },
      { icon: 'diet', label: 'Diet', value: 'Deer, wild boar, buffalo and smaller animals' },
      { icon: 'globe', label: 'Range', value: 'India, Nepal, Bhutan and Bangladesh' },
    ],
    habitat: 'Tropical forest, tall grassland, river margins and mangroves.',
    caption: 'A stripe of shadow moving where the forest breaks.',
    featured: { headline: 'No two coats agree.', text: 'A tiger’s stripes are as individual as a fingerprint, breaking its outline among grass and trees.' },
    closeup: {
      title: 'Built for the ambush',
      text: 'Powerful forequarters and a low, patient approach favour a short decisive rush rather than a long chase.',
      zoom: 2.1,
      rotY: -0.45,
      rotX: 0.12,
    },
    groups: ['mammals'],
    model: {
      url: '/models/tiger.glb',
      habitat: 'forest',
      credit: { title: 'Tiger', author: 'Poly by Google', license: 'CC-BY 3.0', url: 'https://poly.pizza/m/5A3w06FXUup' },
      kind: 'walk',
      idleTimeScale: 1,
      moveTimeScale: 1.25,
      forwardYaw: 0,
      size: 1.0,
    },
  },
  {
    id: 'jellyfish',
    name: 'Pacific Sea Nettle',
    latin: 'Chrysaora fuscescens',
    family: 'Pelagiidae',
    tags: ['Bioluminescent', '95% water', 'Trailing ribbons'],
    description:
      'A glowing amber bell up to a metre across pulses through cool Pacific upwellings, trailing twenty-four maroon tentacles and four ruffled oral arms that wind like silk ribbons in the current.',
    traits: [
      { icon: 'ruler', label: 'Bell width', value: 'Up to 1 m (arms to 4.5 m)' },
      { icon: 'depth', label: 'Depth', value: 'Surface to 100 m' },
      { icon: 'diet', label: 'Diet', value: 'Zooplankton, comb jellies, small fish' },
      { icon: 'globe', label: 'Range', value: 'Eastern Pacific from Alaska to Mexico' },
    ],
    habitat: 'Cold coastal upwellings and kelp-forest borders.',
    caption: 'A lantern of living glass, riding the coastal tide.',
    featured: { headline: 'No brain, yet it hunts.', text: 'Light-sensitive rhopalia around the bell rim steer it toward dawn.' },
    closeup: {
      title: 'Close-up Detail',
      text: 'Four frilled oral arms spiral from the centre of the bell, carrying microscopic stinging capsules.',
      zoom: 2.1,
      rotY: 0.5,
      rotX: -0.35,
    },
    groups: ['ocean', 'abyss'],
    model: {
      url: '/models/jellyfish.glb',
      habitat: 'reef',
      credit: { title: 'Jellyfish', author: 'Poly by Google', license: 'CC-BY 3.0', url: 'https://poly.pizza/m/5PxIqPamrag' },
      kind: 'swim',
      opacity: 0.82,
      pulse: true,
      idleTimeScale: 1,
      moveTimeScale: 1.5,
      forwardYaw: 0,
      size: 1.0,
    },
  },
  {
    id: 'dumbo',
    name: 'Dumbo Octopus',
    latin: 'Grimpoteuthis sp.',
    family: 'Opisthoteuthidae',
    tags: ['Finned octopus', 'Seafloor hoverer', 'No ink sac'],
    description:
      'Named for the ear-like fins it flaps to swim, the dumbo octopus drifts just above the abyssal seabed in near-freezing darkness. It has no ink sac—there is no light to hide in—and swallows its prey whole.',
    traits: [
      { icon: 'ruler', label: 'Length', value: 'Usually 20–30 cm' },
      { icon: 'depth', label: 'Depth', value: '1,000–4,000 m and beyond' },
      { icon: 'diet', label: 'Diet', value: 'Worms, copepods and amphipods' },
      { icon: 'globe', label: 'Range', value: 'Deep oceans worldwide' },
    ],
    habitat: 'Just above the seafloor on deep slopes and abyssal plains.',
    caption: 'Two fins, eight arms, and nowhere to be in a hurry.',
    featured: { headline: 'Ears that are really fins.', text: 'A soft, slow swimmer among the deepest-living octopuses known.' },
    closeup: {
      title: 'Close-up Detail',
      text: 'A web of skin joins all eight arms, so the animal can spread like an umbrella and drift.',
      zoom: 2.0,
      rotY: -0.8,
      rotX: 0.25,
    },
    groups: ['ocean', 'abyss'],
    model: {
      url: '/models/octopus.glb',
      habitat: 'abyss',
      credit: { title: 'Octopus', author: 'jeremy', license: 'CC-BY 3.0', url: 'https://poly.pizza/m/6KQsV8qo5E0' },
      kind: 'swim',
      idleTimeScale: 1,
      moveTimeScale: 1.4,
      forwardYaw: 0,
      size: 0.95,
    },
  },
  {
    id: 'nautilus',
    name: 'Chambered Nautilus',
    latin: 'Nautilus pompilius',
    family: 'Nautilidae',
    tags: ['Living fossil', 'Chambered shell', 'Jet-propelled'],
    description:
      'The nautilus has drifted through the deep for 500 million years almost unchanged. It rises and sinks by pumping gas and water through the sealed chambers of its logarithmic spiral shell.',
    traits: [
      { icon: 'ruler', label: 'Shell width', value: 'Up to 20 cm across' },
      { icon: 'depth', label: 'Depth', value: '100–700 m' },
      { icon: 'diet', label: 'Diet', value: 'Shrimp, crabs and deep-reef carrion' },
      { icon: 'globe', label: 'Range', value: 'Indo-Pacific fore-reefs' },
    ],
    habitat: 'Steep coral reef slopes, deep by day and shallower by night.',
    caption: 'A spiral older than the mountains, still counting its chambers.',
    featured: { headline: 'A shell that remembers.', text: 'Half a billion years old and still rising every night.' },
    closeup: {
      title: 'Close-up Detail',
      text: 'Each flame stripe follows the growth of the shell, and a new nacre chamber is sealed as it grows.',
      zoom: 2.15,
      rotY: -0.4,
      rotX: 0.15,
    },
    groups: ['ocean', 'abyss'],
    model: {
      procedural: 'nautilus',
      habitat: 'abyss',
      kind: 'swim',
      idleTimeScale: 1,
      moveTimeScale: 1.4,
      forwardYaw: 0,
      size: 0.95,
    },
  },
  {
    id: 'manta',
    name: 'Giant Oceanic Manta',
    latin: 'Mobula birostris',
    family: 'Mobulidae',
    tags: ['7-metre wingspan', 'Plankton glider', 'Largest brain of any fish'],
    description:
      'With triangular pectoral wings spanning up to seven metres, the giant oceanic manta flies effortlessly through open water. Pair of horn-like cephalic fins unroll in front of its mouth to funnel plankton inside.',
    traits: [
      { icon: 'wing', label: 'Wingspan', value: '4.5–7.0 m' },
      { icon: 'weight', label: 'Weight', value: 'Up to 2,000 kg' },
      { icon: 'diet', label: 'Diet', value: 'Krill, copepods and fish larvae' },
      { icon: 'globe', label: 'Range', value: 'Tropical and temperate oceans' },
    ],
    habitat: 'Open pelagic waters, seamounts and cleaning stations.',
    caption: 'A shadow wider than a room, flying through blue water.',
    featured: { headline: 'Belly prints like fingerprints.', text: 'Every manta has a unique pattern of spots underneath.' },
    closeup: {
      title: 'Close-up Detail',
      text: 'Cephalic fins curl into tight horns while cruising and unfurl like funnels when feeding.',
      zoom: 2.0,
      rotY: -0.9,
      rotX: 0.35,
    },
    groups: ['ocean'],
    model: {
      url: '/models/manta.glb',
      habitat: 'reef',
      credit: { title: 'Manta Ray', author: 'Quaternius', license: 'CC0', url: 'https://quaternius.com' },
      kind: 'swim',
      idleClip: 'Armature|Swim',
      moveClip: 'Armature|Swim',
      idleTimeScale: 1,
      moveTimeScale: 1.4,
      forwardYaw: 0,
      size: 1.05,
    },
  },
  {
    id: 'whale',
    name: 'Humpback Whale',
    latin: 'Megaptera novaeangliae',
    family: 'Balaenopteridae',
    tags: ['Bubble-net hunter', 'Complex song', 'Pole-to-tropics migrant'],
    description:
      'Named for the arch of its back before a deep dive, the humpback whale sings haunting, evolving songs that travel for hundreds of kilometres through the ocean and collaborates to trap fish in spirals of bubbles.',
    traits: [
      { icon: 'ruler', label: 'Length', value: '13–16 m' },
      { icon: 'weight', label: 'Weight', value: '25,000–35,000 kg' },
      { icon: 'diet', label: 'Diet', value: 'Krill, herring and capelin' },
      { icon: 'globe', label: 'Range', value: 'All major oceans, poles to equator' },
    ],
    habitat: 'Open ocean migration corridors and coastal feeding grounds.',
    caption: 'A song that crosses an ocean, sung in the dark.',
    featured: { headline: 'Wings five metres long.', text: 'The longest pectoral fins of any cetacean give it acrobatic agility.' },
    closeup: {
      title: 'Close-up Detail',
      text: 'Ventral throat pleats expand like an accordion, letting the whale engulf a swimming pool of water in one gulp.',
      zoom: 2.1,
      rotY: -0.7,
      rotX: -0.2,
    },
    groups: ['mammals', 'ocean'],
    model: {
      url: '/models/whale.glb',
      habitat: 'reef',
      credit: { title: 'Whale', author: 'Quaternius', license: 'CC0', url: 'https://quaternius.com' },
      kind: 'swim',
      idleClip: 'Armature|Swim',
      moveClip: 'Armature|Swim',
      idleTimeScale: 1,
      moveTimeScale: 1.4,
      forwardYaw: 0,
      size: 1.1,
    },
  },
  {
    id: 'turtle',
    name: 'Green Sea Turtle',
    latin: 'Chelonia mydas',
    family: 'Cheloniidae',
    tags: ['Seagrass gardener', 'Geomagnetic navigator', 'Natal beach homing'],
    description:
      'Cruising between coral reefs and seagrass meadows, adult green turtles are the only herbivorous sea turtles. Guided by Earth’s magnetic field, females return across thousands of kilometres to nest on the exact beach where they hatched.',
    traits: [
      { icon: 'ruler', label: 'Carapace', value: '80–120 cm' },
      { icon: 'weight', label: 'Weight', value: '110–190 kg' },
      { icon: 'diet', label: 'Diet', value: 'Seagrass and marine algae' },
      { icon: 'globe', label: 'Range', value: 'Tropical and subtropical seas' },
    ],
    habitat: 'Coral reefs, lagoons and coastal seagrass beds.',
    caption: 'An ancient compass, swimming home across the sea.',
    featured: { headline: 'A single breath for hours.', text: 'Resting turtles can slow their heartbeat to one beat every nine minutes.' },
    closeup: {
      title: 'Close-up Detail',
      text: 'Teardrop carapace scutes fit together like a mosaic, streamlined to slip through strong currents.',
      zoom: 2.0,
      rotY: -0.5,
      rotX: 0.4,
    },
    groups: ['reptiles', 'ocean'],
    model: {
      url: '/models/turtle.glb',
      habitat: 'reef',
      credit: { title: 'Turtle', author: 'Poly by Google', license: 'CC-BY 3.0', url: 'https://poly.pizza/m/fklSEvGm1Q8' },
      kind: 'swim',
      idleTimeScale: 1,
      moveTimeScale: 1.4,
      forwardYaw: 0,
      size: 0.95,
    },
  },
  {
    id: 'crocodile',
    name: 'Nile Crocodile',
    latin: 'Crocodylus niloticus',
    family: 'Crocodylidae',
    tags: ['Waterline ambush', 'Armoured skin', 'Attentive parent'],
    description:
      'The Nile crocodile waits almost motionless at the water’s edge, then explodes forward to seize prey with an immense bite. Beneath that patient exterior is an attentive parent: females guard the nest and carry newly hatched young gently in their jaws.',
    traits: [
      { icon: 'ruler', label: 'Length', value: '3–5 m' },
      { icon: 'weight', label: 'Weight', value: '225–750 kg' },
      { icon: 'diet', label: 'Diet', value: 'Fish, birds, antelope and carrion' },
      { icon: 'globe', label: 'Range', value: 'Sub-Saharan Africa and the Nile Basin' },
    ],
    habitat: 'Rivers, lakes, floodplains, wetlands and estuaries.',
    caption: 'Still water, then a sudden rush.',
    featured: { headline: 'Jaws that do not chew.', text: 'Crocodiles grip and tear their food, then swallow manageable pieces rather than chewing.' },
    closeup: {
      title: 'A third eyelid',
      text: 'A translucent nictitating membrane sweeps across the eye for protection while the crocodile is underwater.',
      zoom: 2.0,
      rotY: -0.35,
      rotX: 0.28,
    },
    groups: ['reptiles', 'savanna'],
    model: {
      url: '/models/crocodile.glb',
      habitat: 'wetland',
      credit: { title: 'Crocodile', author: 'Poly by Google', license: 'CC-BY 3.0', url: 'https://poly.pizza/m/2an6E2WjW3z' },
      kind: 'walk',
      idleTimeScale: 1,
      moveTimeScale: 1.2,
      forwardYaw: 0,
      size: 1.05,
    },
  },
  {
    id: 'barramundi',
    name: 'Silver Barramundi',
    latin: 'Lates calcarifer',
    family: 'Latidae',
    tags: ['Salt-to-freshwater', 'Ambush predator', 'Mirror scales'],
    description:
      'Equally at home in tropical coral estuaries and freshwater billabongs, the barramundi flashes silver-bronze scales and strikes with a vacuum-like gulp so fast it produces an audible boom underwater.',
    traits: [
      { icon: 'ruler', label: 'Length', value: '60–150 cm' },
      { icon: 'weight', label: 'Weight', value: 'Up to 60 kg' },
      { icon: 'diet', label: 'Diet', value: 'Mullet, prawns and river crabs' },
      { icon: 'globe', label: 'Range', value: 'Indo-West Pacific & northern Australia' },
    ],
    habitat: 'Mangrove estuaries, coastal reefs and tidal rivers.',
    caption: 'Living quicksilver between the river and the reef.',
    featured: { headline: 'Born male, later female.', text: 'Most barramundi change sex after their first spawning seasons.' },
    closeup: {
      title: 'Close-up Detail',
      text: 'A lateral-line sensory canal runs down each flank, feeling the faintest ripple of prey in murky water.',
      zoom: 2.2,
      rotY: -0.25,
      rotX: 0.08,
    },
    groups: ['ocean'],
    model: {
      url: '/models/fish.glb',
      habitat: 'reef',
      kind: 'swim',
      idleTimeScale: 1,
      moveTimeScale: 1.5,
      forwardYaw: 0,
      size: 0.95,
    },
  },
  {
    id: 'chameleon',
    name: 'Panther Chameleon',
    latin: 'Furcifer pardalis',
    family: 'Chamaeleonidae',
    tags: ['Nanocrystal skin', '360° turret eyes', 'Ballistic tongue'],
    description:
      'Native to the rainforests of Madagascar, the panther chameleon shifts colour by tuning a lattice of microscopic guanine crystals in its skin. Its eyes swivel independently until both lock onto an insect—then its tongue strikes in 0.07 seconds.',
    traits: [
      { icon: 'ruler', label: 'Length', value: '30–50 cm' },
      { icon: 'weight', label: 'Weight', value: '140–250 g' },
      { icon: 'diet', label: 'Diet', value: 'Mantids, crickets and stick insects' },
      { icon: 'globe', label: 'Range', value: 'Northern and eastern Madagascar' },
    ],
    habitat: 'Humid coastal rainforest and sunlit canopy edges.',
    caption: 'Two eyes looking two ways, until both agree.',
    featured: { headline: 'Mirrors inside its skin.', text: 'Colour changes show mood and rivalry more than camouflage.' },
    closeup: {
      title: 'Close-up Detail',
      text: 'A prehensile tail coils like a watch-spring for balance when the front feet reach for the next branch.',
      zoom: 2.15,
      rotY: -0.35,
      rotX: 0.12,
    },
    groups: ['reptiles'],
    model: {
      url: '/models/chameleon.glb',
      habitat: 'forest',
      credit: { title: 'Spotted Gecko', author: 'Jeff Larson', license: 'CC-BY 3.0', url: 'https://poly.pizza/m/65Yj7059c2K' },
      kind: 'walk',
      idleTimeScale: 1,
      moveTimeScale: 1.3,
      forwardYaw: 0,
      size: 0.9,
    },
  },
  {
    id: 'flamingo',
    name: 'Greater Flamingo',
    latin: 'Phoenicopterus roseus',
    family: 'Phoenicopteridae',
    tags: ['Filter feeder', 'Pink by diet', 'Colony nester'],
    description:
      'Greater flamingos feed upside down, sweeping their bent bills through salty shallows to strain out shrimp and algae. The pigments in that food are what turn their feathers pink.',
    traits: [
      { icon: 'ruler', label: 'Height', value: '110–150 cm' },
      { icon: 'wing', label: 'Wingspan', value: '140–165 cm' },
      { icon: 'diet', label: 'Diet', value: 'Brine shrimp, algae and molluscs' },
      { icon: 'globe', label: 'Range', value: 'Africa, southern Europe, South Asia' },
    ],
    habitat: 'Salt lakes, lagoons and estuaries.',
    caption: 'A sunset that learned to stand on one leg.',
    featured: { headline: 'Coloured by its dinner.', text: 'Without carotenoid-rich shrimp, a flamingo fades to white.' },
    closeup: {
      title: 'Close-up Detail',
      text: 'Black flight feathers stay hidden until the wings open, then flash across the whole flock.',
      zoom: 1.9,
      rotY: 0,
      rotX: 0.55,
    },
    thumbnail: { time: 0.35 },
    groups: ['birds'],
    model: {
      url: '/models/flamingo.glb',
      habitat: 'wetland',
      credit: { title: 'Flamingo', author: 'Quaternius', license: 'CC0', url: 'https://quaternius.com' },
      kind: 'fly',
      idleTimeScale: 0.55,
      moveTimeScale: 1.2,
      forwardYaw: 0,
      size: 1.1,
    },
  },
  {
    id: 'parrot',
    name: 'Scarlet Macaw',
    latin: 'Ara macao',
    family: 'Psittacidae',
    tags: ['Vocal mimic', 'Long-lived', 'Canopy flocks'],
    description:
      'Scarlet macaws travel in noisy pairs and small flocks through the rainforest canopy, flashing crimson, yellow and blue between fruiting trees. Many live past 50 and mate for life.',
    traits: [
      { icon: 'ruler', label: 'Length', value: '80–90 cm (half is tail)' },
      { icon: 'weight', label: 'Weight', value: '0.9–1.5 kg' },
      { icon: 'diet', label: 'Diet', value: 'Fruit, seeds, nuts and clay' },
      { icon: 'globe', label: 'Range', value: 'Central and South America' },
    ],
    habitat: 'Lowland rainforest and river edges.',
    caption: 'A streak of fire across the canopy.',
    featured: { headline: 'Clay for breakfast.', text: 'Riverbank clay neutralises the toxins in unripe rainforest seeds.' },
    closeup: {
      title: 'Close-up Detail',
      text: 'A hooked bill strong enough to crack Brazil nuts, and a tongue with a bone inside to turn the kernel.',
      zoom: 2.3,
      rotY: 0.9,
      rotX: 0.1,
    },
    thumbnail: { time: 0.35 },
    groups: ['birds'],
    model: {
      url: '/models/parrot.glb',
      habitat: 'forest',
      credit: { title: 'Parrot', author: 'Quaternius', license: 'CC0', url: 'https://quaternius.com' },
      kind: 'fly',
      idleTimeScale: 0.6,
      moveTimeScale: 1.3,
      forwardYaw: 0,
      size: 0.95,
    },
  },
  {
    id: 'stork',
    name: 'White Stork',
    latin: 'Ciconia ciconia',
    family: 'Ciconiidae',
    tags: ['Long-haul migrant', 'Rooftop nester', 'Thermal soarer'],
    description:
      'Each autumn white storks ride rising thermals from Europe to Africa, barely flapping across up to 10,000 km. In spring they return to the very same chimney nests, some in use for centuries.',
    traits: [
      { icon: 'ruler', label: 'Height', value: '100–115 cm' },
      { icon: 'wing', label: 'Wingspan', value: '155–215 cm' },
      { icon: 'diet', label: 'Diet', value: 'Frogs, insects, fish and voles' },
      { icon: 'globe', label: 'Range', value: 'Europe, Africa, West Asia' },
    ],
    habitat: 'Open wetlands, meadows and village rooftops.',
    caption: 'Ten thousand kilometres on borrowed warm air.',
    featured: { headline: 'Home to the same chimney.', text: 'Pairs reunite at one nest, year after year.' },
    closeup: {
      title: 'Close-up Detail',
      text: 'Adults are almost voiceless, so they greet each other by clattering their long red bills.',
      zoom: 2,
      rotY: 0.4,
      rotX: 0.3,
    },
    thumbnail: { time: 0.35 },
    groups: ['birds', 'savanna'],
    model: {
      url: '/models/stork.glb',
      habitat: 'wetland',
      credit: { title: 'Stork', author: 'Quaternius', license: 'CC0', url: 'https://quaternius.com' },
      kind: 'fly',
      idleTimeScale: 0.5,
      moveTimeScale: 1.1,
      forwardYaw: 0,
      size: 1.1,
    },
  },
  {
    id: 'penguin',
    name: 'Emperor Penguin',
    latin: 'Aptenodytes forsteri',
    family: 'Spheniscidae',
    tags: ['Antarctic breeder', 'Deep diver', 'Huddle warmer'],
    description:
      'Emperor penguins breed through the Antarctic winter, when males balance a single egg on their feet and fast while the females feed at sea. Dense huddles shelter the colony from katabatic winds, and each bird eventually moves from the cold edge toward the warmer centre.',
    traits: [
      { icon: 'ruler', label: 'Height', value: '100–130 cm' },
      { icon: 'weight', label: 'Weight', value: '22–45 kg' },
      { icon: 'depth', label: 'Depth', value: 'Usually 200–500 m on deep dives' },
      { icon: 'globe', label: 'Range', value: 'Antarctic pack ice and the Southern Ocean' },
    ],
    habitat: 'Sea ice, ice shelves and cold surrounding seas.',
    caption: 'An egg kept warm on a father’s feet.',
    featured: { headline: 'A city of shared warmth.', text: 'The huddle is always moving as birds take turns between its sheltered centre and exposed edge.' },
    closeup: {
      title: 'Feathers like a wetsuit',
      text: 'Short, densely packed feathers trap insulating air and form a smooth water-resistant surface.',
      zoom: 2.0,
      rotY: -0.3,
      rotX: 0.15,
    },
    groups: ['birds', 'ocean'],
    model: {
      url: '/models/penguin.glb',
      habitat: 'polar',
      credit: { title: 'Penguin', author: 'Poly by Google', license: 'CC-BY 3.0', url: 'https://poly.pizza/m/fBXvsC6pe_V' },
      kind: 'walk',
      idleTimeScale: 0.8,
      moveTimeScale: 1.2,
      forwardYaw: 0,
      size: 0.95,
    },
  },
];

export const byId = (id: string) => SPECIES.find((s) => s.id === id) ?? SPECIES[0];
