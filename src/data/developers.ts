import fondatixAvatar from "@/assets/developers/fondatix.png";
import fondatixHeadshot from "@/assets/developers/fondatix-head.png";
import prayaiotAvatar from "@/assets/developers/prayaiot.png";
import prayaiotHeadshot from "@/assets/developers/prayaiot-head.png";
import synpleticAvatar from "@/assets/developers/synpletic.png";
import synpleticHeadshot from "@/assets/developers/synpletic-head.png";

export type Developer = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  studio: string;
  joined: string;
  verified: boolean;
  profileUrl: string;
  avatar: string;
  headshot: string;
  blurb: string;
  tags: string[];
};

export const DEVELOPERS: Developer[] = [
  {
    id: "130036453",
    username: "Fondatix",
    displayName: "Fond",
    role: "Developer & UI artist",
    studio: "Muffin Interactive",
    joined: "2016",
    verified: true,
    profileUrl: "https://www.roblox.com/users/130036453/profile",
    avatar: fondatixAvatar,
    headshot: fondatixHeadshot,
    blurb:
      "Game developer and interface artist behind Muffin Interactive. Builds systems, UI and content for teams across the platform.",
    tags: ["Game systems", "UI art", "Studio lead"],
  },
  {
    id: "48123208",
    username: "synpletic",
    displayName: "alex",
    role: "Builder & 3D artist",
    studio: "Independent",
    joined: "2013",
    verified: false,
    profileUrl: "https://www.roblox.com/users/48123208/profile",
    avatar: synpleticAvatar,
    headshot: synpleticHeadshot,
    blurb:
      "Architectural designer and modeler. World-building credits include Cream and Clean The Library, with a focus on detailed, atmospheric spaces.",
    tags: ["World building", "3D modeling", "UGC"],
  },
  {
    id: "100921914",
    username: "prayaIot",
    displayName: "prayaIot",
    role: "Developer & experience designer",
    studio: "Sahur Corp.",
    joined: "2015",
    verified: true,
    profileUrl: "https://www.roblox.com/users/100921914/profile",
    avatar: prayaiotAvatar,
    headshot: prayaiotHeadshot,
    blurb:
      "Experience credits include +1 Speed Run for Brainrots and Brenda's Nursery. His portfolio has drawn hundreds of millions of visits.",
    tags: ["Experiences", "Obby design", "Studio growth"],
  },
];
