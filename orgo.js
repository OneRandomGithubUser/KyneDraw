// Written by Joseph. github.com/OneRandomGithubUser
const bondLength = 50;
var bondAngle = 0;
var nextID = 0; // next atom ID
var bondType = 1;
var element = "C";
var reagents = "";
var bondMode = true;
var network = []; // array of Atom objects
// TODO: new Network object? might make index searching O(n) instead of O(1)
var closestDistance = 0; // 20 is the maximum distance for selection
var selectedAtom = []; // selected atom when snap-on is in effect
var destinationAtom = [];
var previewX1 = 0;
var previewY1 = 0;
var previewX2 = 0;
var previewY2 = 0; // to determine where the cursor is, with snap-on
const selectionDistance = 15;
const destinationDistance = 5;
var mousePressed = false;
var selectedBox = 0;
const minWidth = 1920;
const minHeight = 210;
let windowHeight = 0;
let windowLength = 0;
let previousWindowHeight = 0;
let previousWindowWidth = 0;
var previousMouseX = 0.0;
var previousMouseY = 0.0;
var angleSnap = true;
var validBond = true;
let background2;
let middleground;
let foreground;
var intro = true;
var renderFrame = false;
var renderMiddleground = false;
var tip;
var hackerman = false;
var selectedBond;
var tips = [
  "Press the CLEAR button to clear all atoms on the screen",
  "Press the SNAP BONDS or FREEFORM BONDS to change the way bonds are made when clicking and dragging",
  "Click and drag to make a custom bond",
  "Click on an element button to change into atom addition mode",
  "Click on a bond button to change into bond addition mode",
  "This website is powered by p5.js",
  "Click on a reagent button to simulate a reaction",
  "This is a very simplified view of organic chemistry, don't expect this program to know everything",
  "Snap onto preexisting atoms to make bonds from that atom or to change the element of that atom",
  "This website has been optimized for speed at the expense of memory usage"
];
// TODO: bad practice to make so many global variables

// define the Atom class
// TODO: possible performance improvements by caching functional groups, though too small to worry about right now
class Atom {
  constructor(id,element,x,y,numBonds,deleted,nextBondAngle,bondIdList,bondTypeList) {
    this.id = id;
    this.element = element;
    this.x = x;
    this.y = y;
    this.numBonds = numBonds;
    this.deleted = deleted;
    this.nextBondAngle = nextBondAngle;
    this.bondIdList = bondIdList;
    this.bondTypeList = bondTypeList;
  }

  delete() {
    this.deleted = true;
    for (let i = 0; i < this.bondIdList.length; i++) {
      let currentAtom = network[i];
      for (let j = 0; j < currentAtom.bondIdList.length; j++) {
        if (currentAtom.bondIdList[j] === this.id) {
          currentAtom.bondIdList.splice(j,1);
          currentAtom.bondTypeList.splice(j,1);
        }
      }
    }
    return true;
  }

  addBond(element, bondType) {
    if (bondType + this.numBonds > maxBonds(this.element) || bondType > maxBonds(element)) {
      // bondType makes too many bonds for a valid molecule
      return false;
    } else {
      let bondAngle;
      if (this.bondTypeList.length === 0) {
        // lone atom
        bondAngle = 330;
      } else if (bondType === 3 || this.bondTypeList[0] === 3) {
        // make linear triple bonds
        bondAngle = (this.getBondAngles()[0]+180)%360;
      } else {
        bondAngle = this.nextBondAngle;
      }
      let previewX2 = this.x + Math.cos(toRadians(360-bondAngle))*bondLength;
      let previewY2 = this.y + Math.sin(toRadians(360-bondAngle))*bondLength;
      let id2 = nextID;
      nextID++;
      this.numBonds += bondType;
      this.bondIdList.push(id2);
      this.bondTypeList.push(bondType);
      network.push(new Atom(id2, element, previewX2, previewY2, bondType, false, 0, [this.id], [bondType]));
      this.updateNextBondAngle();
      network[id2].nextBondAngle = network[id2].calculateNextBondAngle();
      // then update the frame
      renderFrame = true;
      renderMiddleground = true;
      return true;
    }
  }
  
  alkeneAddition(markovnikovElementToAdd, nonmarkovnikovElementToAdd) {
    if (this.element != "C" || this.isBenzene()) {
      // current element must be a carbon and not part of a benzene ring
      return false;
    } else {
      let changed = false;
      for (let i = 0; i < this.bondTypeList.length; i++) {
        let reps = this.bondTypeList[i]-1; // number of times to repeat bond addition. reps = 1 if alkene, reps = 2 if alkyne
        if (reps === 1 || reps === 2) { // find the alkene/alkyne(s)
          let atom2 = network[this.bondIdList[i]];
          if (atom2.element === "C") {
            this.bondTypeList[i] -= reps;
            this.numBonds -= reps;
            this.updateNextBondAngle();
            for (let j = 0; j < atom2.bondIdList.length; j++) {
              if (atom2.bondIdList[j] === this.id) {
                atom2.bondTypeList[j] -= reps;
                atom2.numBonds -= reps;
              }
            }
            atom2.updateNextBondAngle();
            if (this.isMoreStableCarbocationThan(atom2)) {
              for (let j = 0; j < reps; j++) {
                if (markovnikovElementToAdd != "") {
                  this.addBond(markovnikovElementToAdd, 1);
                }
                if (nonmarkovnikovElementToAdd != "") {
                  atom2.addBond(nonmarkovnikovElementToAdd, 1);
                }
              }
            } else {
              for (let j = 0; j < reps; j++) {
                if (nonmarkovnikovElementToAdd != "") {
                  this.addBond(nonmarkovnikovElementToAdd, 1);
                }
                if (markovnikovElementToAdd != "") {
                  atom2.addBond(markovnikovElementToAdd, 1);
                }
              }
            }
            changed = true;
          }
        }
      }
      return changed;
    }
  }
  
  alkeneAddition2(markovnikovElementToAdd, markovnikovNumBondsToAdd, nonmarkovnikovElementToAdd, nonmarkovnikovNumBondsToAdd) {
    if (this.element != "C" || this.isBenzene()) {
      // current element must be a carbon and not part of a benzene ring
      return false;
    } else {
      let changed = false;
      for (let i = 0; i < this.bondTypeList.length; i++) {
        let reps = this.bondTypeList[i]-1; // number of times to repeat bond addition. reps = 1 if alkene, reps = 2 if alkyne
        if (reps === 1 || reps === 2) { // find the alkene/alkyne(s)
          let atom2 = network[this.bondIdList[i]];
          if (atom2.element === "C") {
            this.bondTypeList[i] -= reps;
            this.numBonds -= reps;
            this.updateNextBondAngle();
            for (let j = 0; j < atom2.bondIdList.length; j++) {
              if (atom2.bondIdList[j] === this.id) {
                atom2.bondTypeList[j] -= reps;
                atom2.numBonds -= reps;
              }
            }
            atom2.updateNextBondAngle();
            if (this.isMoreStableCarbocationThan(atom2)) {
              for (let j = 0; j < reps; j++) {
                if (markovnikovElementToAdd != "") {
                  this.addBond(markovnikovElementToAdd, markovnikovNumBondsToAdd);
                }
                if (nonmarkovnikovElementToAdd != "") {
                  atom2.addBond(nonmarkovnikovElementToAdd, nonmarkovnikovNumBondsToAdd);
                }
              }
            } else {
              for (let j = 0; j < reps; j++) {
                if (nonmarkovnikovElementToAdd != "") {
                  this.addBond(nonmarkovnikovElementToAdd, nonmarkovnikovNumBondsToAdd);
                }
                if (markovnikovElementToAdd != "") {
                  atom2.addBond(markovnikovElementToAdd, markovnikovNumBondsToAdd);
                }
              }
            }
            changed = true;
          }
        }
      }
      return changed;
    }
  }
  
  updateNumBonds() {
    let numBonds = 0;
    for (let i = 0; i < this.bondTypeList.length; i++) {
      numBonds += this.bondTypeList[i];
    }
    this.numBonds = numBonds;
    return true;
  }

  isMoreSubstitutedThan(atom) {
    return this.bondIdList.length > atom.bondIdList.length;
  }

  isMoreStableCarbocationThan(atom) {
    // TODO: finish isMoreStableCarbocationThan function: what if it is unknown?
    return this.carbocationStability() > atom.carbocationStability();
  }

  carbocationStability() {
    return this.carbocationStabilityHelper(0);
  }

  carbocationStabilityHelper(index) {
    // TODO: this is a really inefficient algorithm and this is a bad way to handle other carbocations and can get stuck on aromatic rings
    if (this.element != "C") {
      return 0;
    }
    let ans = 0;
    if (index === 0) {
      // if this is the first atom, find the number of bonded atoms, then add anything due to resonance
      ans += this.bondIdList.length;
      for (let i = 0; i < this.bondIdList.length; i++) {
        ans += network[this.bondIdList[i]].carbocationStabilityHelper(index+1);
      }
    } else {
      for (let i = 0; i < this.bondIdList.length; i++) {
        if (this.isBenzene()) {
          // add 4 for the super stable benzene if it's next to the original, otherwise decrease it by half every atom it's away. probably not accurate
          ans+=4/(2**index-1);
        } else if (this.bondTypeList[i] === index % 2 + 1) {
          // bad way to try to account for resonance. add 1/2+1/4+1/8+... for each resonance contributor. probably does not count all resonance
          ans += 1/(2**index);
          ans += network[this.bondIdList[i]].carbocationStabilityHelper(index+1);
        }
      }
    }
    return ans;
  }

  getBondAngles() {
    let ans = [];
    for (let i = 0; i < this.bondIdList.length; i++) {
      ans.push(Math.round(findBondAngle(this.x, this.y, network[this.bondIdList[i]].x, network[this.bondIdList[i]].y)));
    }
    return ans;
  }
  
  isHydroxyl() {
    return this.element === "O" && this.numBonds === 1 && network[this.bondIdList[0]].element === "C";
  }

  isKetone() { // is ketone or aldehyde
    return this.element === "O" && this.numBonds === 2 && this.bondIdList.length == 1 && network[this.bondIdList[0]].element === "C";
  }

  isLeavingGroup() {
    return (this.element === "Br" || this.element === "Cl" || this.element === "F" || this.element === "I" || this.element === "Ts") && this.numBonds === 1 && this.bondIdList.length == 1 && network[this.bondIdList[0]].element === "C";
  }

  isBenzene() {
    return this.isBenzeneHelper(0, this.id);
  }
  
  // cycle through each bond one by one and see if there is a chain of 6 carbon atoms of single,double,single,double,single,double bonds (no need to check the other pattern since it's the same)
  isBenzeneHelper(index, finalID) {
    if (index === 6) {
      if (this.id === finalID) { // see if, after 6 carbons, the chain cycles back to the original
        return true;
      } else {
        return false;
      }
    } else if (this.element != "C") { // see if this atom is a carbon
      return false;
    } else {
      // recursively run the helper function on atoms bonded with the next single/double bond
      let ans = false;
      for (let i = 0; i < this.bondTypeList.length; i++) {
        if (this.bondTypeList[i] === index % 2 + 1) {
          ans = ans || network[this.bondIdList[i]].isBenzeneHelper(index+1, finalID);
        }
      }
      return ans;
    }
  }

  updateNextBondAngle() {
    this.nextBondAngle = this.calculateNextBondAngle();
    return true;
  }

  // TODO: this is really poorly written. but it works.
  calculateNextBondAngle() {
    let currentBondSectors = []; // ranges from 0 to 11 for each 30 degree sector, starting at -15 degrees
    let currentBondAngles = this.getBondAngles();
    if (this.numBonds !== 0) {
      for (let i = 0; i < this.bondIdList.length; i++) {
        currentBondSectors.push(Math.floor((findBondAngle(this.x, this.y, network[this.bondIdList[i]].x, network[this.bondIdList[i]].y)+15)/30));
      }
    }
    switch (currentBondSectors.length) {
      case 0:
        return 330;
      case 1:
        let answer = (currentBondSectors[0]*30+120)%360
        let alternate = (currentBondSectors[0]*30+240)%360
        if (Math.min(alternate%180,180-(alternate%180)) < Math.min(answer%180,180-(answer%180))) {answer = alternate;}
        return answer;
      case 2:
        if (Math.abs(currentBondAngles[0] - currentBondAngles[1]) > 180) {
          return (Math.floor((currentBondAngles[0]+currentBondAngles[1])/2))%360;
        } else {
          return (Math.floor((currentBondAngles[0]+currentBondAngles[1])/2)+180)%360;
        }
      case 3:
        if (!currentBondSectors.includes(8) && !currentBondSectors.includes(9)) {
          return 240;
        } else if (!currentBondSectors.includes(2)) {
          return 60;
        } else {
          for (let i = 0; i < 12
            ; i++) {
            if (!currentBondSectors.includes(i)) {
              return i*30;
            }
          }
        }
        return -1;
      default:
        return -1;
    }
  }
}

// preload Arial font
let font;
function preload() {
  font = loadFont("./arial.ttf");
}

// set up canvases
function setup() {
  // createCanvas must be the first statement
  // background2: static UI elements
  // middleground: background2, preexisting bonds, atoms, and dynamic UI elements
  // foreground: preview bond/atom, snap indicators
  windowWidth = Math.max(window.innerWidth,minWidth);
  windowHeight = Math.max(window.innerHeight,minHeight);
  createCanvas(windowWidth,windowHeight);
  textFont(font);
  middleground = createGraphics(windowWidth,windowHeight);
  background2 = createGraphics(windowWidth,windowHeight);
  foreground = createGraphics(windowWidth,windowHeight);
  background2.textAlign(CENTER, CENTER);
  background2.clear();
  drawBackground();
  middleground.stroke(0); // Set line drawing color to black
  middleground.textSize(16);
  middleground.textAlign(CENTER, CENTER);
  foreground.textSize(16);
  foreground.textAlign(CENTER, CENTER);
  frameRate(60);
  pixelDensity(1);
  tip = "Tip: "+ tips[Math.floor(Math.random()*tips.length)];
  console.log("Written by Joseph. github.com/OneRandomGithubUser");
}

function draw() {
  try {
    let cachedMouseX = mouseX;
    let cachedMouseY = mouseY;
    if (hackerman && frameCount%3 === 0) {
      // this is a joke
      clickButton(11);
      clickButton(12);
    }

    if (renderFrame) {
      background(255);
      foreground.clear();

      // update UI once they are moused over
      if (cachedMouseY < 120 && cachedMouseY > 20) {
        if (cachedMouseX < 120 && cachedMouseX > 20) {
          selectBox(1); // single bond
        } else if (cachedMouseX < 240 && cachedMouseX > 140) {
          selectBox(2); // double bond
        } else if (cachedMouseX < 360 && cachedMouseX > 260) {
          selectBox(3); // triple bond
        } else if (cachedMouseX < 480 && cachedMouseX > 380) {
          selectBox(6); // C
        } else if (cachedMouseX < 600 && cachedMouseX > 500) {
          selectBox(7); // O
        } else if (cachedMouseX < 720 && cachedMouseX > 620) {
          selectBox(8); // N
        } else if (cachedMouseX < 840 && cachedMouseX > 740) {
          selectBox(9); // Br
        } else if (cachedMouseX < 960 && cachedMouseX > 860) {
          selectBox(10); // Cl
        } else if (cachedMouseY < 70) {
          if (cachedMouseX > windowWidth-120 && cachedMouseX < windowWidth-20) {
            selectBox(4); // FREEFORM BONDS
          } else if (cachedMouseX > windowWidth-240 && cachedMouseX < windowWidth-140) {
            selectBox(5); // SNAP BONDS
          } else if (cachedMouseX > windowWidth-360 && cachedMouseX < windowWidth-260) {
            selectBox(11); // CLEAR MOLECULE
          } else if (cachedMouseX > windowWidth-480 && cachedMouseX < windowWidth-380) {
            selectBox(12); // RANDOM MOLECULE
          } else if (cachedMouseX > windowWidth-600 && cachedMouseX < windowWidth-500) {
            selectBox(13); // HACKERMAN
          }
        }
      } else if (cachedMouseY > windowHeight-70 && cachedMouseY < windowHeight-20) {
        if (cachedMouseX < 120 && cachedMouseX > 20) {
          selectBox(19);
        } else if (cachedMouseX < 240 && cachedMouseX > 140) {
          selectBox(20);
        } else if (cachedMouseX < 360 && cachedMouseX > 260) {
          selectBox(21);
        } else if (cachedMouseX < 480 && cachedMouseX > 380) {
          selectBox(22);
        } else if (cachedMouseX < 600 && cachedMouseX > 500) {
          selectBox(23);
        } else if (cachedMouseX < 720 && cachedMouseX > 620) {
          selectBox(24);
        } else if (cachedMouseX < 840 && cachedMouseX > 740) {
          selectBox(25);
        } else if (cachedMouseX < 960 && cachedMouseX > 860) {
          selectBox(26);
        } else if (cachedMouseX < 1080 && cachedMouseX > 980) {
          selectBox(27);
        } else if (cachedMouseX < 1200 && cachedMouseX > 1100) {
          selectBox(28);
        } else if (cachedMouseX < 1320 && cachedMouseX > 1220) {
          selectBox(29);
        } else if (cachedMouseX < 1440 && cachedMouseX > 1340) {
          selectBox(30);
        } else if (cachedMouseX < 1560 && cachedMouseX > 1460) {
          selectBox(31);
        } else if (cachedMouseX < 1680 && cachedMouseX > 1580) {
          selectBox(32);
        } else if (cachedMouseX < 1800 && cachedMouseX > 1700) {
          selectBox(33);
        } else if (cachedMouseX < 1920 && cachedMouseX > 1820) {
          selectBox(34);
        }
      } else if (selectedBox != 0) {
        selectedBox = 0;
        renderMiddleground = true;
      }

      if (renderMiddleground) {
        // set draw attributes common to these buttons to speed up performance
        // yes, making these buttons are reinventing the wheel. therefore, TODO: make HTML buttons
        middleground.clear();
        middleground.image(background2, 0, 0, windowWidth, windowHeight);
        middleground.fill(230);

        // render bond button overlays
        bondButton(20,20,1);
        bondButton(140,20,2);
        bondButton(260,20,3);

        // render atom button overlays
        middleground.noFill();
        middleground.textSize(48);
        middleground.textStyle(NORMAL);
        atomButtonOverlay(380,20,"C",6);
        atomButtonOverlay(500,20,"O",7);
        atomButtonOverlay(620,20,"N",8);
        atomButtonOverlay(740,20,"Br",9);
        atomButtonOverlay(860,20,"Cl",10);

        // render angle snap button overlays
        middleground.textSize(16);
        middleground.textStyle(BOLD);
        angleSnapButtonOverlay(windowWidth-240,20,"SNAP BONDS",5);
        angleSnapButtonOverlay(windowWidth-120,20,"FREEFORM BONDS",4);

        // render clear and random button overlay
        thinButtonOverlay(windowWidth-360,20,"CLEAR",11);
        thinButtonOverlay(windowWidth-480,20,"RANDOM MOLECULE",12);
        thinButtonOverlay(windowWidth-600,20,"HACKERMAN",13);
        
        // render reaction button overlays
        thinButtonOverlay(20,windowHeight-70,"H⁺,H₂O",19);
        thinButtonOverlay(140,windowHeight-70,"PdCl₂,H₂O",20);
        thinButtonOverlay(260,windowHeight-70,"POCl₃",21);/*
        thinButtonOverlay(380,windowHeight-70,"KOH",22);*/
        thinButtonOverlay(500,windowHeight-70,"HBr",23);
        thinButtonOverlay(620,windowHeight-70,"HBr, H₂O₂",24);
        thinButtonOverlay(740,windowHeight-70,"Br₂",25);
        thinButtonOverlay(860,windowHeight-70,"Br₂, H₂O",26);
        thinButtonOverlay(980,windowHeight-70,"H₂, Pd",27);
        thinButtonOverlay(1100,windowHeight-70,"Hg(OAc)₂,H₂O,BH₄",28);
        thinButtonOverlay(1220,windowHeight-70,"BH₃",29);
        thinButtonOverlay(1340,windowHeight-70,"NaBH₄",30);
        thinButtonOverlay(1460,windowHeight-70,"Swern",31);
        thinButtonOverlay(1580,windowHeight-70,"PBr₃",32);
        thinButtonOverlay(1700,windowHeight-70,"SOCl₂",33);
        thinButtonOverlay(1820,windowHeight-70,"TsCl",34);

        middleground.textStyle(NORMAL);
        middleground.stroke(0);
        middleground.fill(0);
      }

      // selected atom when snap-on is in effect
      if (!mousePressed) {
        selectedAtom = [];
        selectedBond = [];
      }

      closestDistance = selectionDistance;
      let closestBondDistance = selectionDistance;
      validBond = true;

      // cycle through all atoms
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        // don't even consider deleted atoms
        if (currentAtom.deleted) {
          continue;
        }

        if (renderMiddleground) {
          middleground.textSize(20);

          // render preexisting bonds
          if (currentAtom.numBonds !== 0) {
            for (let j = 0; j < currentAtom.bondIdList.length; j++) {
              if (currentAtom.bondIdList[j] > currentAtom.id) {
                bond(currentAtom.x, currentAtom.y, network[currentAtom.bondIdList[j]].x, network[currentAtom.bondIdList[j]].y, currentAtom.bondTypeList[j], middleground);
              }
            }
          }
          
          // render preexisting atoms
          middleground.noStroke();
          if (currentAtom.deleted) {
            continue; // deleted atom
          } else {
            let label = currentAtom.element;
            if (label === "C") {
              if (currentAtom.numBonds === 0) {
                label = "CH₄"
              } else {
                label = "";
              }
            } else if (label === "O") {
              switch (currentAtom.numBonds) {
                case 0:
                  label = "H₂O";
                  break;
                case 1:
                  label = "OH";
                  break;/*
                case 3:
                  label = "O⁺"
                  break;
                case 4:
                  label = "O²⁺"*/
              }
            } else if (label === "N") {
              switch (currentAtom.numBonds) {
                case 0:
                  label = "NH₃";
                  break;
                case 1:
                  label = "NH₂";
                  break;
                case 2:
                  label = "NH";
                  break;/*
                case 4:
                  label = "N⁺"
                  break;*/
              }
            }
            if (label !== "") {
              middleground.fill(255);
              let boundingBox = font.textBounds(label, currentAtom.x, currentAtom.y, 20, CENTER, CENTER);
              middleground.rect(boundingBox.x-5-boundingBox.w/2, boundingBox.y-5, boundingBox.w+10, boundingBox.h+10); // TODO: figure out why this is so weird
              middleground.fill(0);
              middleground.text(label, currentAtom.x, currentAtom.y);
            }
          }
          middleground.stroke(0);
        }

        // calculate closest selected atom/bond as long as the mouse is not pressed
        // TODO: this algorithm can be made much more efficient
        if (!mousePressed) {
          // find closest atom
          let distance = Math.sqrt((cachedMouseX-currentAtom.x)**2 + (cachedMouseY-currentAtom.y)**2);
          if (distance < closestDistance) {
            closestDistance = distance;
            selectedAtom = currentAtom;
          }
          if (selectedAtom.length === 0 && bondMode) {
            // find closest bond if there is no closest atom
            for (let j = 0; j < currentAtom.bondIdList.length; j++) {
              let currentAtom2 = network[currentAtom.bondIdList[j]];
              let distance = distanceToBond(cachedMouseX, cachedMouseY, currentAtom.x, currentAtom.y, currentAtom2.x, currentAtom2.y);
              if (distance < closestBondDistance) {
                closestBondDistance = distance;
                selectedBond = [currentAtom, currentAtom2, currentAtom.bondTypeList[j]];
              }
            }
          }
        }
      }

      // calculate new bond angle
      if (selectedAtom.length !== 0 && !mousePressed && bondMode) {
        if (selectedAtom.numBonds > maxBonds(selectedAtom.element)-bondType) {
          // too many bonds
          bondAngle = -1;
        } else if (selectedAtom.bondTypeList.length === 0) {
          // lone atom
          bondAngle = 330;
        } else if (bondType === 3 || selectedAtom.bondTypeList[0] === 3) {
          // make linear triple bonds
          bondAngle = (selectedAtom.getBondAngles()[0]+180)%360;
        } else {
          bondAngle = selectedAtom.nextBondAngle;
        }
        previewX1 = selectedAtom.x;
        previewY1 = selectedAtom.y;
        previewX2 = selectedAtom.x + Math.cos(toRadians(360-bondAngle))*bondLength;
        previewY2 = selectedAtom.y + Math.sin(toRadians(360-bondAngle))*bondLength;
      } else if (selectedAtom.length !== 0 && !bondMode) {
        previewX1 = selectedAtom.x;
        previewY1 = selectedAtom.y;
        if (selectedAtom.numBonds > maxBonds(element)) {
          bondAngle = -1;
          validBond = false;
        } else {
          bondAngle = 330;
        }
      } else if (mousePressed) { // on mouse press, stop updating previewX1 and previewY1
        if (angleSnap) {
          if (selectedAtom.numBonds > maxBonds(selectedAtom.element)-bondType) { // too many bonds
            bondAngle = -1;
          } else {
            bondAngle = Math.floor((findBondAngle(previewX1,previewY1,cachedMouseX,mouseY)+15)/30)*30; // round bond angle to nearest 30 degrees
          }
          previewX2 = previewX1 + Math.cos(toRadians(360-bondAngle))*bondLength;
          previewY2 = previewY1 + Math.sin(toRadians(360-bondAngle))*bondLength;
        } else {
          previewX2 = cachedMouseX;
          previewY2 = mouseY;
          if (selectedAtom.numBonds > maxBonds(selectedAtom.element)-bondType) { // too many bonds
            bondAngle = -1;
          } else {
            bondAngle = findBondAngle(previewX1,previewY1,cachedMouseX,mouseY);
          }
        }
      } else { // fallback
        previewX1 = cachedMouseX;
        previewY1 = mouseY;
        previewX2 = cachedMouseX + Math.cos(toRadians(360-bondAngle))*bondLength;
        previewY2 = mouseY + Math.sin(toRadians(360-bondAngle))*bondLength;
        bondAngle = 330;
      }
      
      // render cyan/red selection dot
      if (selectedAtom.length !== 0) {
        if (bondAngle === -1) {
          foreground.fill(255,0,0);
          validBond = false;
        } else {
          foreground.fill(48,227,255);
          validBond = true;
        }
        foreground.circle(selectedAtom.x,selectedAtom.y,10);
        foreground.fill(255);
      }

      // highlight selected bond
      if (selectedAtom.length === 0 && selectedBond.length !== 0 && bondMode) {
        let color;
        if (selectedBond[0].numBonds - selectedBond[2] + bondType > maxBonds(selectedBond[0].element) || selectedBond[1].numBonds - selectedBond[2] + bondType > maxBonds(selectedBond[1].element)) {
          // don't change selected bond if it would cause too many bonds
          color = [255,0,0];
          highlightedBond(selectedBond[0].x, selectedBond[0].y, selectedBond[1].x, selectedBond[1].y, selectedBond[2], color, foreground);
          bond(selectedBond[0].x, selectedBond[0].y, selectedBond[1].x, selectedBond[1].y, bondType, foreground);
          selectedBond = [];
        } else {
          color = [48,227,255];
          highlightedBond(selectedBond[0].x, selectedBond[0].y, selectedBond[1].x, selectedBond[1].y, selectedBond[2], color, foreground);
          bond(selectedBond[0].x, selectedBond[0].y, selectedBond[1].x, selectedBond[1].y, bondType, foreground);
        }
        bondAngle = -1;
        validBond = false;
      }

      if (bondMode) {
        // calculate destination atom
        destinationAtom = [];
        closestDistance = destinationDistance;
        for (let i = 0; i < network.length; i++) {
          let currentAtom = network[i];
          let distance = Math.sqrt((previewX2-currentAtom.x)**2 + (previewY2-currentAtom.y)**2);
          if (distance < destinationDistance && distance < closestDistance && validBond) {
            if (selectedAtom.length !== 0) {
              // check if the currentAtom is already bonded to the selectedAtom
              for (let j = 0; j < selectedAtom.bondIdList.length; j++) {
                if (selectedAtom.bondIdList[j] === currentAtom.id) {
                  bondAngle = -1;
                  validBond = false;
                  destinationAtom = currentAtom;
                }
              }
            }
            if (validBond) {
              closestDistance = distance;
              destinationAtom = currentAtom;
            }
          }
        }

        // render cyan/red destination dot
        if (destinationAtom.length !== 0) {
          if (destinationAtom.numBonds <= maxBonds(destinationAtom.element)-bondType && validBond) {
            foreground.fill(48,227,255);
            foreground.circle(destinationAtom.x,destinationAtom.y,10);
            foreground.fill(255);
            previewX2 = destinationAtom.x;
            previewY2 = destinationAtom.y;
            bondAngle = findBondAngle(previewX1,previewY1,previewX2,previewY2);
          } else {
            foreground.fill(255,0,0);
            foreground.circle(destinationAtom.x,destinationAtom.y,10);
            foreground.fill(255);
            previewX2 = destinationAtom.x;
            previewY2 = destinationAtom.y;
            bondAngle = -1;
          }
        }
      }

      // draw preview
      if (!bondMode) {
        foreground.rectMode(CENTER);
        foreground.fill(0);
        foreground.noStroke();
        foreground.textSize(20);
        foreground.text(element, previewX1, previewY1);
        foreground.fill(255);
        foreground.stroke(0);
        foreground.rectMode(CORNER);
      } else if (validBond) {
        bond(previewX1, previewY1, previewX2, previewY2, bondType, foreground);
      }

      if (renderMiddleground) {
        renderMiddleground = false;
      }
      // copy buffers to screen
      image(middleground, 0, 0, windowWidth, windowHeight);
      image(foreground, 0, 0, windowWidth, windowHeight);
    }
    // determine whether or not to render the next frame
    if (intro) {
      if (frameCount < 120) {
        foreground.stroke(255);
        if (frameCount > 60) {
          foreground.fill(255,255-(frameCount-60)/60*255);
          foreground.rect(0,0,windowWidth,windowHeight);
          foreground.fill(0,255-(frameCount-60)/60*255);
        } else {      
          foreground.fill(255);
          foreground.rect(0,0,windowWidth,windowHeight);
          foreground.fill(0);
        }
        if (frameCount === 60) {
          renderFrame = true;
          renderMiddleground = true;
        }
        foreground.textSize(144);
        foreground.text("KyneDraw",0,windowHeight/2,windowWidth);
        foreground.textSize(36);
        foreground.text(tip,0,windowHeight*3/4,windowWidth)
        foreground.stroke(0);
        image(foreground, 0, 0, windowWidth, windowHeight);
      } else if (frameCount >= 120) {
        intro = false;
      }
    } else {
    // pause rendering during inactivity and when not in intro
      if (previousMouseX === cachedMouseX && previousMouseY === mouseY) {
        renderFrame = false;
      } else {
        previousMouseX = cachedMouseX;
        previousMouseY = cachedMouseY;
      }
    }
  } catch (err) {
    // print error and debug message if something happens
    let errorMessage = document.createElement("p");
    errorMessage.appendChild(document.createTextNode("An error has occured. Please send me a screenshot as well as what had just happened that caused the error. Thank you!\n"));
    errorMessage.appendChild(document.createTextNode(err.stack+"\n")); // stack trace
    document.getElementById("error").appendChild(errorMessage);
    clear();
    image(middleground, 0, windowHeight*0.2, windowWidth*0.8, windowHeight*0.8);
    noLoop();
  }
}

function mouseDragged() {
  renderFrame = true;
  mousePressed = true;
}

function mouseMoved() {
  renderFrame = true;
  return false;
}

function mouseReleased() {
  renderFrame = true;
  mousePressed = false;
}

function toRadians(angle) {
  return angle * (Math.PI/180);
}

function toDegrees(angle) {
  return angle * (180/Math.PI);
}

function selectBox(id) {
  if (selectedBox != id) {
    selectedBox = id;
    renderMiddleground = true;
  } 
}

function lineOffset(x1,y1,x2,y2,offset,frame) {
  let angle = findBondAngle(x1,y1,x2,y2);
  frame.line(x1-Math.sin(toRadians(angle))*offset, y1-Math.cos(toRadians(angle))*offset, x2-Math.sin(toRadians(angle))*offset, y2-Math.cos(toRadians(angle))*offset);
}

function angleSnapButton(x,y,label,box) {
  background2.fill(230);
  background2.rect(x,y,100,50);
  background2.fill(0);
  background2.text(label,x,y,100,50);
}

function angleSnapButtonOverlay(x,y,label,box) {
  if (selectedBox === box) {
    middleground.stroke(255);
    middleground.rect(x,y,100,50);
    middleground.noStroke();
    middleground.text(label,x,y,100,50);
    middleground.stroke(0);
    middleground.noFill();
  } else if (angleSnap && box === 5 || !angleSnap && box === 4) {
    middleground.fill(205);
    middleground.rect(x,y,100,50);
    middleground.noStroke();
    middleground.fill(0);
    middleground.text(label,x,y,100,50);
    middleground.stroke(0);
    middleground.noFill();
  } else {
    middleground.rect(x,y,100,50);
  }
}

function bondButton(x,y,bonds) { // does not need an overlay version because lines are very fast to render
  if (bondType === bonds && bondMode) {
    middleground.fill(205);
  }
  if (selectedBox === bonds) {
    middleground.stroke(255);
    middleground.rect(x,y,100,100);
    middleground.stroke(0);
  } else {
    middleground.rect(x,y,100,100);
  }
  if (bondType === bonds && bondMode) {
    middleground.fill(230);
  }
  bond(x+50-Math.cos(toRadians(30))*bondLength/2,y+50-Math.sin(toRadians(30))*bondLength/2,x+50+Math.cos(toRadians(30))*bondLength/2,y+50+Math.sin(toRadians(30))*bondLength/2,bonds,middleground);
}

function atomButton(x,y,atom,box) {
  background2.fill(230);
  background2.rect(x,y,100,100);
  background2.fill(0);
  background2.text(atom,x,y,100,100);
}

function atomButtonOverlay(x,y,atom,box) {
  if (selectedBox === box) {    
    middleground.stroke(255);
    if (element === atom && !bondMode) {
      middleground.fill(205);
    }
    middleground.rect(x,y,100,100);
    middleground.noStroke();
    middleground.fill(0);
    middleground.text(atom,x,y,100,100);
    middleground.stroke(0);
    middleground.noFill();
  } else if (element === atom && !bondMode) {
    middleground.fill(205);
    middleground.rect(x,y,100,100);
    middleground.noStroke();
    middleground.fill(0);
    middleground.text(atom,x,y,100,100);
    middleground.stroke(0);
    middleground.noFill();
  } else {
    middleground.rect(x,y,100,100);
  }
}

function thinButton(x,y,reaction,box) {
  background2.fill(230);
  background2.rect(x,y,100,50);
  background2.fill(0);
  background2.text(reaction,x,y,100,50);
}

function thinButtonOverlay(x,y,reaction,box) {
  if (selectedBox === box) {
    middleground.stroke(255);
    middleground.rect(x,y,100,50);
  } else {
    middleground.stroke(0);
    middleground.rect(x,y,100,50);
  }
}

function windowResized() {
  drawBackground();
}

function drawBackground() {
  if (windowWidth != Math.max(window.innerWidth-20,minWidth) || windowHeight != Math.max(window.innerHeight-20,minHeight)) {
    windowWidth = Math.max(window.innerWidth-20,minWidth);
    windowHeight = Math.max(window.innerHeight-20,minHeight);
    resizeCanvas(windowWidth,windowHeight);
    var newGraphics = createGraphics(windowWidth,windowHeight);
    background2 = newGraphics;
    background2.textAlign(CENTER, CENTER);
    var newGraphics = createGraphics(windowWidth,windowHeight);
    middleground = newGraphics;
    middleground.textAlign(CENTER, CENTER);
    var newGraphics = createGraphics(windowWidth,windowHeight);
    foreground = newGraphics;
    foreground.textAlign(CENTER, CENTER);
  }
  renderFrame = true;
  renderMiddleground = true;

  background2.clear();
  background2.noStroke();
  background2.textSize(48);
  atomButton(380,20,"C",6);
  atomButton(500,20,"O",7);
  atomButton(620,20,"N",8);
  atomButton(740,20,"Br",9);
  atomButton(860,20,"Cl",10);
  background2.textSize(16);
  background2.textStyle(BOLD);
  thinButton(20,windowHeight-70,"H⁺,H₂O",19);
  thinButton(140,windowHeight-70,"PdCl₂,H₂O",20);
  thinButton(260,windowHeight-70,"POCl₃",21);/*
  thinButton(380,windowHeight-70,"KOH",22);*/
  thinButton(500,windowHeight-70,"HBr",23);
  thinButton(620,windowHeight-70,"HBr, H₂O₂",24);
  thinButton(740,windowHeight-70,"Br₂",25);
  thinButton(860,windowHeight-70,"Br₂, H₂O",26);
  thinButton(980,windowHeight-70,"H₂, Pd",27);
  thinButton(1100,windowHeight-70,"Hg(OAc)₂,H₂O,BH₄",28);
  thinButton(1220,windowHeight-70,"BH₃",29);
  thinButton(1340,windowHeight-70,"NaBH₄",30);
  thinButton(1460,windowHeight-70,"Swern",31);
  thinButton(1580,windowHeight-70,"PBr₃",32);
  thinButton(1700,windowHeight-70,"SOCl₂",33);
  thinButton(1820,windowHeight-70,"TsCl",34);
  thinButton(windowWidth-360,20,"CLEAR",11);
  thinButton(windowWidth-480,20,"RANDOM MOLECULE",12);
  // TODO: when buttons are changed to HTML, make hackerman button selectable
  thinButton(windowWidth-600,20,"HACKERMAN",13);
  angleSnapButton(windowWidth-240,20,"SNAP BONDS",5);
  angleSnapButton(windowWidth-120,20,"FREEFORM BONDS",4);
  background2.stroke(0);
  background2.textStyle(NORMAL);
}

function distanceToBond(x, y, x1, y1, x2, y2) {

  // taken from https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment/6853926#6853926

  var A = x - x1;
  var B = y - y1;
  var C = x2 - x1;
  var D = y2 - y1;

  var dot = A * C + B * D;
  var len_sq = C * C + D * D;
  var param = -1;
  if (len_sq != 0) //in case of 0 length line
      param = dot / len_sq;

  var xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  }
  else if (param > 1) {
    xx = x2;
    yy = y2;
  }
  else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  var dx = x - xx;
  var dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

function findBondAngle(x1,y1,x2,y2) {
  let ans;
  if (y1 === y2) {
    switch (Math.sign(x1-x2)) {
      case 1:
        return 180;
      case -1:
        return 0;
      case 0:
        return -1;
    }
  } else {
    ans = toDegrees(Math.atan(-(y2-y1)/(x2-x1)));
  }
  if (ans < 0) {ans+=180;}
  if (-(y2-y1) < 0) {ans = (180+ans)%360;}
  return ans;
}

function highlightedBond(x1,y1,x2,y2,num,colorArray,frame) {
  frame.stroke(colorArray);
  frame.strokeWeight(3);
  bond(x1,y1,x2,y2,num,frame);
  frame.strokeWeight(1);
  frame.stroke(0);
}

function bond(x1,y1,x2,y2,num,frame) {
  if (num > 3) {
    throw new Error ("Too many bonds!");
  } else if (num < 1) {
    throw new Error ("Negative or zero bonds!");
  }
  frame.line(x1,y1,x2,y2);
  if (num >= 2) {
    lineOffset(x1,y1,x2,y2,5,frame);
    if (num === 3) {
      lineOffset(x1,y1,x2,y2,-5,frame);
    }
  }
}

function maxBonds(element) {
  if (element === "C") {
    return 4;
  } else if (element === "N") {
    return 3;
  } else if (element === "O") {
    return 2;
  } else if (element === "Br" || element === "Cl" || element === "Ts" || element === "I" || element === "F" || element === "OTBS") {
    return 1;
  } else {
    return -1;
  }
}

function mouseClicked() {
  clickButton(selectedBox);
  return false;
}

function clickButton(selectedBox) {
  switch (selectedBox) {
    case 1:
      bondType = selectedBox;
      bondMode = true;
      break;
    case 2:
      bondType = selectedBox;
      bondMode = true;
      break;
    case 3:
      bondType = selectedBox;
      bondMode = true;
      break;
    case 4:
      angleSnap = false;
      break;
    case 5:
      angleSnap = true;
      break;
    case 6:
      element = "C"
      bondMode = false;
      break;
    case 7:
      element = "O"
      bondMode = false;
      break;
    case 8:
      element = "N"
      bondMode = false;
      break;
    case 9:
      element = "Br"
      bondMode = false;
      break;
    case 10:
      element = "Cl"
      bondMode = false;
      break;
    case 11:
      network = [];
      nextID = 0;
      break;
    case 12:
      let startingID = nextID;
      network.push(new Atom(nextID, "C", windowWidth/2+Math.random()*windowWidth/10, windowHeight/2+Math.random()*windowHeight/10, bondType, false, 330, [], []));
      nextID++;
      let generating = true;
      let randomAtom;
      let randomNum;
      let randomElement;
      let randomBondNumber;
      while (generating) {
        randomAtom = network[startingID + Math.floor(Math.random() * (nextID-startingID))];
        randomNum = Math.random();
        if (randomNum < 0.85) {
          randomElement = "C";
        } else if (randomNum < 0.94) {
          randomElement = "O"
        } else if (randomNum < 0.97) {
          randomElement = "N";
        } else {
          randomElement = "Br";
        }
        randomNum = Math.random();
        if (randomNum < 0.8) {
          randomBondNumber = 1;
        } else if (randomNum < 0.92) {
          randomBondNumber = 2;
        } else {
          randomBondNumber = 3;
        }
        randomAtom.addBond(randomElement, randomBondNumber);
        if (Math.random() > 0.9) {
          generating = false;
        }
      }
      break;
    case 13:
      hackerman = !hackerman;
      break;
    case 19:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        } 
        currentAtom.alkeneAddition("O","");
      }
      break;
    case 20:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAddition2("O",2,"",1);
      }
      break;
    case 21:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isHydroxyl()) {
          let adjacentAtom = network[currentAtom.bondIdList[0]]; // carbon atom that the oxygen is attached to
          let mostSubstitutedAtom = new Atom(0,"C",0,0,0,true,330,[],[]); // blank atom
          for (let j = 0; j < adjacentAtom.bondIdList.length; j++) { // look at the atoms attached to the adjacentAtom
            let adjacentAdjacentAtom = network[adjacentAtom.bondIdList[j]];
            if (adjacentAdjacentAtom.element != "C" || adjacentAdjacentAtom.id === currentAtom.id || adjacentAdjacentAtom.numBonds >= maxBonds(adjacentAdjacentAtom.element)) {
              continue;
            } else if (adjacentAdjacentAtom.isMoreSubstitutedThan(mostSubstitutedAtom)) {
              mostSubstitutedAtom = adjacentAdjacentAtom; // TODO: consider what happens when equally substituted
            }
          }
          if (!mostSubstitutedAtom.deleted) {
            // remove hydroxyl group (currentAtom)
            currentAtom.delete();
            mostSubstitutedAtom.updateNextBondAngle();
            // add another bond to the mostSubstitutedAtom to the adjacentAtom
            for (let j = 0; j < mostSubstitutedAtom.bondIdList.length; j++) {
              if (mostSubstitutedAtom.bondIdList[j] === adjacentAtom.id) {
                mostSubstitutedAtom.bondTypeList[j]++;
                mostSubstitutedAtom.numBonds++;
              }
            }
            for (let j = 0; j < adjacentAtom.bondIdList.length; j++) {
              if (adjacentAtom.bondIdList[j] === mostSubstitutedAtom.id) {
                // add bond from adjacentAtom to the mostSubstitutedAtom
                // numBonds is not updated because it will be cancelled out by the OH removal
                adjacentAtom.bondTypeList[j]++;
              } else if (adjacentAtom.bondIdList[j] === i) {
                // remove bond between adjacentAtom and currentAtom (OH group)
                adjacentAtom.bondIdList.splice(j,1);
                adjacentAtom.bondTypeList.splice(j,1); // remove OH from C
                j--; // adjust for shorter adjacentAtom
              }
            }
          }
        }
      }
      break;
    case 22:
      // TODO: finish this and make this only accept antiperiplanar
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.isLeavingGroup()) {
          currentAtom.isMoreSubstitutedThan
        }
      }
    case 23:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAddition("Br","");
      }
      break;
    case 24:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAddition("","Br");
      }
      break;
    case 25:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAddition("Br","Br");
      }
      break;
    case 26:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAddition("O","Br");
      }
      break;
    case 27:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        // this technically doesn't work for things double bonded to a benzene ring, but that's not possible anyways
        if (!currentAtom.isBenzene()) {
          let changed = false;
          for (let j = 0; j < currentAtom.bondTypeList.length; j++) {
            if (currentAtom.bondTypeList !== 1) {
              currentAtom.bondTypeList[j] = 1;
              changed = true;
            }
          }
          if (changed) {
            currentAtom.updateNumBonds();
          }
        }
      }
      case 28:
        for (let i = 0; i < network.length; i++) {
          let currentAtom = network[i];
          if (currentAtom.deleted) {
            continue;
          }
          currentAtom.alkeneAddition("O","O");
        }
        break;
      case 29:
        for (let i = 0; i < network.length; i++) {
          let currentAtom = network[i];
          if (currentAtom.deleted) {
            continue;
          }
          currentAtom.alkeneAddition("","O");
        }
        break;
      case 30:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isKetone(currentAtom)) {
          adjacentAtom = network[currentAtom.bondIdList[0]];
          currentAtom.bondTypeList[0] = 1;
          currentAtom.numBonds = 1;
          for (let j = 0; j < adjacentAtom.bondTypeList.length; j++) {
            if (adjacentAtom.bondIdList[j] === currentAtom.id) {
              adjacentAtom.bondTypeList[j] = 1;
              adjacentAtom.updateNumBonds();
            }
          }
        }
      }
      break;
    case 31:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isHydroxyl(currentAtom)) {
          adjacentAtom = network[currentAtom.bondIdList[0]];
          if (adjacentAtom.numBonds >= maxBonds(adjacentAtom.element)) { // too many bonds to form another
            break;
          }
          currentAtom.bondTypeList[0] = 2;
          currentAtom.numBonds = 2;
          for (let j = 0; j < adjacentAtom.bondTypeList.length; j++) {
            if (adjacentAtom.bondIdList[j] === currentAtom.id) {
              adjacentAtom.bondTypeList[j] = 2;
              adjacentAtom.updateNumBonds();
            }
          }
        }
      } 
      break;
    case 32:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isHydroxyl()) {
          currentAtom.element = "Br";
        }
      }
      break;
    case 33:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isHydroxyl()) {
          currentAtom.element = "Cl";
        }
      }
      break;
    case 34:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isHydroxyl()) {
          currentAtom.element = "Ts";
        }
      }
      break;
    case 0: // when no box is selected
    if (bondMode) {
      element = "C";
      // -1 means invalid bond TODO: change this, bondAngle is not needed elsewhere anymore
      if (selectedAtom.length === 0 && selectedBond.length !== 0 && selectedBond[2] !== bondType) {
        // TODO: unoptimized
        for (let i = 0; i < selectedBond[0].bondTypeList.length; i++) {
          if (selectedBond[0].bondIdList[i] === selectedBond[1].id) {
            selectedBond[0].bondTypeList[i] = bondType;
            selectedBond[0].numBonds = selectedBond[0].numBonds - selectedBond[2] + bondType; // update numBonds
          }
        }
        for (let i = 0; i < selectedBond[1].bondTypeList.length; i++) {
          if (selectedBond[1].bondIdList[i] === selectedBond[0].id) {
            selectedBond[1].bondTypeList[i] = bondType;
            selectedBond[1].numBonds = selectedBond[1].numBonds - selectedBond[2] + bondType; // update numBonds
          }
        }
      } else if (bondAngle === -1 || !validBond) {
        return false;
      } else {
        let id1 = nextID;
        if (selectedAtom.length !== 0) {
          id1 = selectedAtom.id;
        } else {        
          nextID++;
        }
        let id2 = nextID;
        if (destinationAtom.length !== 0) {
          id2 = destinationAtom.id;
        } else {
          nextID++;
        }

        if (network.length<=id1) {
          network.push(new Atom(id1, element, previewX1, previewY1, bondType, false, 0, [id2], [bondType]));
        } else {
          network[id1].numBonds += bondType;
          network[id1].bondIdList.push(id2);
          network[id1].bondTypeList.push(bondType);
        }
        if (network.length<=id2) {
          network.push(new Atom(id2, element, previewX2, previewY2, bondType, false, 0, [id1], [bondType]));
        } else {
          network[id2].numBonds += bondType;
          network[id2].bondIdList.push(id1);
          network[id2].bondTypeList.push(bondType);
        }
        network[id1].nextBondAngle = network[id1].calculateNextBondAngle();
        network[id2].nextBondAngle = network[id2].calculateNextBondAngle();
        break;
      }
    } else {
      if (!validBond) {
        break;
      } else if (selectedAtom.length !== 0) {
        selectedAtom.element = element;
      } else {
        network.push(new Atom(nextID, element, previewX1, previewY1, 0, false, 0, [], []));
        network[nextID].nextBondAngle = network[nextID].calculateNextBondAngle();
        nextID++;
      }
    }
  }
  renderFrame = true;
  renderMiddleground = true;
}