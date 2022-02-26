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
const minWidth = 1580;
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
var somethingClicked = false;
var buttonClicked = false;
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
  "This website has been optimized for speed at the expense of memory usage",
  "This web app does not yet support stereochemistry, charges, resonance, or E-Z configuration"
];
// TODO: bad practice to make so many global variables

// define the Atom class
// TODO: possible performance improvements by caching functional groups, though too small to worry about right now
class Atom {
  constructor(id,element,x,y,numBonds,deleted,predictedNextBondAngle,bondIdList,bondTypeList) {
    this.id = id;
    this.element = element;
    this.x = x;
    this.y = y;
    this.numBonds = numBonds;
    this.deleted = deleted;
    this.predictedNextBondAngle = predictedNextBondAngle;
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

  addBond(element, bond, connectToExistingAtoms, optionalBondAngle) {
    if (bond + this.numBonds > maxBonds(this.element) || bond > maxBonds(element)) {
      // bond makes too many bonds for a valid molecule
      return false;
    } else {
      let bondAngle;
      if (optionalBondAngle === undefined) {
        bondAngle = this.getNextBondAngle(bond);
      } else {
        bondAngle = optionalBondAngle;
      }
      let closestDestinationAtom = [];
      let previewX2 = this.x + Math.cos(toRadians(360-bondAngle))*bondLength;
      let previewY2 = this.y + Math.sin(toRadians(360-bondAngle))*bondLength;
      let id2 = nextID;
      // connect to an existing atom, ignoring element
      closestDestinationAtom = findClosestDestinationAtom(previewX2,previewY2,[],network);
      if (closestDestinationAtom.length !== 0) {
        if (connectToExistingAtoms && closestDestinationAtom.numBonds + bond < maxBonds(closestDestinationAtom.element)) {
          this.bondIdList.push(closestDestinationAtom.id);
          this.bondTypeList.push(bond);
          this.numBonds += bond;
          this.updateNextBondAngle();
          closestDestinationAtom.bondIdList.push(this.id);
          closestDestinationAtom.bondTypeList.push(bond);
          closestDestinationAtom.numBonds += bond;
          closestDestinationAtom.updateNextBondAngle();

          // then update the frame
          renderFrame = true;
          renderMiddleground = true;
          return true;
        } else {
          // if cannot connect to existing atoms, make the new bond somewhere else by simulating the next bond as if there were simBonds already on the atom
          let simBonds = this.numBonds + 1;
          while (simBonds < 12) {
            bondAngle = this.calculateNextBondAngle(simBonds);
            previewX2 = this.x + Math.cos(toRadians(360-bondAngle))*bondLength;
            previewY2 = this.y + Math.sin(toRadians(360-bondAngle))*bondLength;
            closestDestinationAtom = findClosestDestinationAtom(previewX2,previewY2,[],network);
            if (closestDestinationAtom.length === 0) {
              break;
            }
            simBonds++;
          }
        }
      }
      this.numBonds += bond;
      this.bondIdList.push(id2);
      this.bondTypeList.push(bond);
      network.push(new Atom(id2, element, previewX2, previewY2, bond, false, 0, [this.id], [bond]));
      nextID++;
      this.updateNextBondAngle();
      network[id2].updateNextBondAngle();

      // then update the frame
      renderFrame = true;
      renderMiddleground = true;
      return true;
    }
  }
  
  alkeneAddition(markovnikovElementToAdd, nonmarkovnikovElementToAdd, optionalMarkovnikovNumBondsToAdd = 1, optionalNonmarkovnikovNumBondsToAdd = 1) {
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
                  this.addBond(markovnikovElementToAdd, optionalMarkovnikovNumBondsToAdd, false);
                }
                if (nonmarkovnikovElementToAdd != "") {
                  atom2.addBond(nonmarkovnikovElementToAdd, optionalNonmarkovnikovNumBondsToAdd, false);
                }
              }
            } else {
              for (let j = 0; j < reps; j++) {
                if (nonmarkovnikovElementToAdd != "") {
                  this.addBond(nonmarkovnikovElementToAdd, optionalNonmarkovnikovNumBondsToAdd, false);
                }
                if (markovnikovElementToAdd != "") {
                  atom2.addBond(markovnikovElementToAdd, optionalMarkovnikovNumBondsToAdd, false);
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
  
  alkyneAddition(markovnikovElementToAdd, nonmarkovnikovElementToAdd, optionalMarkovnikovNumBondsToAdd = 1, optionalNonmarkovnikovNumBondsToAdd = 1) {
    if (this.element != "C") {
      // current element must be a carbon
      return false;
    } else {
      let changed = false;
      for (let i = 0; i < this.bondTypeList.length; i++) {
        if (this.bondTypeList[i] === 3) {
          let atom2 = network[this.bondIdList[i]];
          if (atom2.element === "C") {
            this.bondTypeList[i]-=2;
            this.numBonds-=2;
            this.updateNextBondAngle();
            for (let j = 0; j < atom2.bondIdList.length; j++) {
              if (atom2.bondIdList[j] === this.id) {
                atom2.bondTypeList[j]-=2;
                atom2.numBonds-=2;
              }
            }
            atom2.updateNextBondAngle();
            if (this.isMoreStableCarbocationThan(atom2)) {
              if (markovnikovElementToAdd != "") {
                this.addBond(markovnikovElementToAdd, optionalMarkovnikovNumBondsToAdd, false);
              }
              if (nonmarkovnikovElementToAdd != "") {
                atom2.addBond(nonmarkovnikovElementToAdd, optionalNonmarkovnikovNumBondsToAdd, false);
              }
            } else {
              if (nonmarkovnikovElementToAdd != "") {
                this.addBond(nonmarkovnikovElementToAdd, optionalNonmarkovnikovNumBondsToAdd, false);
              }
              if (markovnikovElementToAdd != "") {
                atom2.addBond(markovnikovElementToAdd, optionalMarkovnikovNumBondsToAdd, false);
              }
            }
            changed = true;
          }
        }
      }
      return changed;
    }
  }

  createBond(atom2, bondType) {
    this.bondIdList.push(atom2.id);
    atom2.bondIdList.push(this.id);
    this.bondTypeList.push(bondType);
    atom2.bondTypeList.push(bondType);
    this.updateNextBondAngle();
    atom2.updateNextBondAngle();
    this.numBonds += bondType;
    atom2.numBonds += bondType;
  }

  removeBond(atom2) {
    let currentIndex = this.bondIdList.indexOf(atom2.id);
    if (currentIndex !== -1) {
      let bonds = this.bondTypeList[currentIndex];
      this.bondIdList.splice(currentIndex, 1);
      this.bondTypeList.splice(currentIndex, 1);
      this.numBonds -= bonds;
      this.updateNextBondAngle();
      let adjacentIndex = atom2.bondIdList.indexOf(this.id);
      atom2.bondIdList.splice(adjacentIndex, 1);
      atom2.bondTypeList.splice(adjacentIndex, 1);
      atom2.numBonds -= bonds;
      atom2.updateNextBondAngle();
      return true;
    } else {
      return false;
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
      ans.push(Math.round(this.findBondAngleWith(network[this.bondIdList[i]])));
    }
    return ans;
  }
  
  findBondAngleWith(atom2) {
    return findBondAngle(this.x, this.y, atom2.x, atom2.y);
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

  distanceToBondOf(atom1, atom2) {
    return distanceToBond(this.x, this.y, atom1.x, atom1.y, atom2.x, atom2.y);
  }

  sideOfBondOf(atom1, atom2) {
    return sideOfBond(this.x, this.y, atom1.x, atom1.y, atom2.x, atom2.y);
  }  

  getNextBondAngle(bondType) {
    if (this.numBonds === 0) {
      // lone atom
      return 330;
    } else if (bondType === 3 || this.bondTypeList.includes(3)) {
      // make linear triple bonds
      return (this.getBondAngles()[0]+180)%360;
    } else if (bondType === 2 && this.bondTypeList.includes(2)) {
      // make linear allene
      return (this.getBondAngles()[0]+180)%360;
    } else {
      return this.predictedNextBondAngle;
    }
  }

  updateNextBondAngle() {
    this.predictedNextBondAngle = this.calculateNextBondAngle();
    return true;
  }

  // TODO: this is really poorly written. but it works at least.
  // optionalPriority is the number of preexisting bonds that this function will pretend that the atom has
  calculateNextBondAngle(optionalPriority = this.bondIdList.length) {
    let currentBondSectors = []; // ranges from 0 to 11 for each 30 degree sector, starting at -15 degrees
    let currentBondAngles = this.getBondAngles();
    if (this.numBonds !== 0) {
      for (let i = 0; i < this.bondIdList.length; i++) {
        currentBondSectors.push(Math.floor((this.findBondAngleWith(network[this.bondIdList[i]])+15)/30));
      }
    }
    if (optionalPriority > this.bondIdList.length) {
      // if optionalPriority is more than the actual number of bonded atoms to the atom, go to default behavior from switch statement
      let ans = optionalPriority;
      while (currentBondSectors.includes(ans) && ans < 12) {
        ans++;
      }
      ans *= 30;
      return ans;
    } 
    switch (optionalPriority) {
      case 0:
        return 330;
      case 1:
        let answer = (currentBondSectors[0]*30+120)%360
        let alternate = (currentBondSectors[0]*30+240)%360
        if (Math.min(alternate%180,180-(alternate%180)) < Math.min(answer%180,180-(answer%180))) {
          answer = alternate;
        }
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
          for (let i = 0; i < 12; i++) {
            if (!currentBondSectors.includes(i)) {
              return i*30;
            }
          }
        }
        return -1;
      default:
        // cycle around the sectors until one is empty or you reach 330 degrees
        let ans = optionalPriority;
        while (currentBondSectors.includes(ans) && ans < 12) {
          ans++;
        }
        ans *= 30;
        return ans;
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
  // middleground: background2, preexisting bonds and atoms
  // foreground: preview bond/atom, snap indicators
  windowWidth = Math.max(window.innerWidth-20,minWidth);
  windowHeight = Math.max(window.innerHeight-20,minHeight);
  createCanvas(windowWidth,windowHeight);
  textFont(font);
  middleground = createGraphics(windowWidth,windowHeight);
  foreground = createGraphics(windowWidth,windowHeight);
  background2 = createGraphics(windowWidth,windowHeight);
  background2.textSize(48);
  background2.textAlign(RIGHT, BOTTOM);
  background2.text("KyneDraw", windowWidth-20, windowHeight-20);
  middleground.stroke(0); // Set line drawing color to black
  middleground.textSize(20);
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
      // this is a joke feature
      clickButton(11);
      clickButton(12);
    }

    if (somethingClicked) {
      if (buttonClicked) {
        buttonClicked = false;
      } else {
        selectBox(0);
      }
      clickButton(selectedBox);
      somethingClicked = false;
    }

    if (renderFrame) {
      background(255);
      foreground.clear();

      if (renderMiddleground) {
        middleground.clear();
        middleground.image(background2, 0, 0, windowWidth, windowHeight);
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
          // render preexisting bonds
          if (currentAtom.numBonds !== 0) {
            for (let j = 0; j < currentAtom.bondIdList.length; j++) {
              if (currentAtom.bondIdList[j] > currentAtom.id) {
                let adjacentAtom = network[currentAtom.bondIdList[j]];
                if (!adjacentAtom.deleted) {
                  bond(currentAtom.x, currentAtom.y, adjacentAtom.x, adjacentAtom.y, currentAtom.bondTypeList[j], middleground);
                }
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
            } else if ((label === "Br" || label === "Cl" || label === "I" || label === "F" || label === "Ts") && currentAtom.numBonds === 0) {
              label += "⁻";
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
              if (!currentAtom2.deleted) {
                let distance = distanceToBond(cachedMouseX, cachedMouseY, currentAtom.x, currentAtom.y, currentAtom2.x, currentAtom2.y);
                if (distance < closestBondDistance) {
                  closestBondDistance = distance;
                  selectedBond = [currentAtom, currentAtom2, currentAtom.bondTypeList[j]];
                }
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
        } else {
          bondAngle = selectedAtom.getNextBondAngle(bondType);
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
        destinationAtom = findClosestDestinationAtom(previewX2,previewY2,selectedAtom,network);

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
    errorMessage.appendChild(document.createTextNode("An error has occured. Please send me a bug report including a screenshot as well as what had just happened that caused the error. Thank you!\n"));
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
  if (id !== 0) {
    buttonClicked = true;
  }
  selectedBox = id;
  renderFrame = true;
  renderMiddleground = true;
}

function lineOffset(x1,y1,x2,y2,offset,frame) {
  let angle = findBondAngle(x1,y1,x2,y2);
  frame.line(x1-Math.sin(toRadians(angle))*offset, y1-Math.cos(toRadians(angle))*offset, x2-Math.sin(toRadians(angle))*offset, y2-Math.cos(toRadians(angle))*offset);
}

function findClosestDestinationAtom(x,y,selectedAtom,network) {
  let closestDistance = destinationDistance;
  let closestDestinationAtom = [];
  let currentAtom;
  let distance;
  for (let i = 0; i < network.length; i++) {
    currentAtom = network[i];
    distance = Math.sqrt((x-currentAtom.x)**2 + (y-currentAtom.y)**2);
    if (distance < destinationDistance && distance < closestDistance && validBond) {
      if (selectedAtom.length !== 0) {
        // check if the currentAtom is already bonded to the selectedAtom
        for (let j = 0; j < selectedAtom.bondIdList.length; j++) {
          if (selectedAtom.bondIdList[j] === currentAtom.id) {
            bondAngle = -1;
            validBond = false;
            closestDestinationAtom = currentAtom;
          }
        }
      }
      if (validBond) {
        closestDistance = distance;
        closestDestinationAtom = currentAtom;
      }
    }
  }
  return closestDestinationAtom;
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
    background2.textSize(48);
    background2.textAlign(RIGHT, BOTTOM);
    background2.text("KyneDraw", windowWidth-20, windowHeight-20);
    newGraphics.remove();
    var newGraphics = createGraphics(windowWidth,windowHeight);
    middleground = newGraphics;
    newGraphics.remove();
    middleground.textSize(20);
    middleground.textAlign(CENTER, CENTER);
    var newGraphics = createGraphics(windowWidth,windowHeight);
    foreground = newGraphics;
    newGraphics.remove();
    middleground.textSize(20);
    foreground.textAlign(CENTER, CENTER);
  }
  renderFrame = true;
  renderMiddleground = true;
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

function sideOfBond(x, y, x1, y1, x2, y2) {
  // this is the cross product of AB and AP, where A is x1,y1, B is x2,y2, and P is x,y
  return (x-x1)*(y2-y1) - (y-y1)*(x2-x1);
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
  somethingClicked = true;
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
      network.push(new Atom(nextID, "C", windowWidth/2+Math.random()*windowWidth/10, windowHeight/2+Math.random()*windowHeight/10, 0, false, 330, [], []));
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
        randomAtom.addBond(randomElement, randomBondNumber, true);
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
        currentAtom.alkeneAddition2("O","",2,1);
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
    case 35:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAddition("O","");
      }
      break;
    case 36:
      // TODO: several possible products
      let terminalAlkenes = [];
      for (let i = 0; i < network.length; ++i) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.numBonds === 2 && currentAtom.bondIdList.length === 1 && currentAtom.element === "C") {
          let adjacentAtom = network[currentAtom.bondIdList[0]];
          if (adjacentAtom.element === "C") {
            terminalAlkenes.push([currentAtom,adjacentAtom]);
          }
        }
      }
      if (terminalAlkenes.length >= 2) {
        for (let i = 0; i < terminalAlkenes.length; i+=2) {
          let currentAtom1 = terminalAlkenes[i][0];
          let adjacentAtom1 = terminalAlkenes[i][1];
          let currentAtom2 = terminalAlkenes[i+1][0];
          let adjacentAtom2 = terminalAlkenes[i+1][1];
          if (adjacentAtom1.bondIdList.includes(adjacentAtom2.id)) {
            // doeesn't work on but-1,3-ene
            continue;
          }
          currentAtom1.delete();
          currentAtom2.delete();
          adjacentAtom1.createBond(adjacentAtom2, 2);
        }
      }
      break;
    case 37:
      // TODO: several possible products
      for (let i = 0; i < network.length; ++i) {
        let currentAtom = network[i];
        if (currentAtom.deleted || currentAtom.element !== "C") {
          continue;
        }
        for (let j = 0; j < currentAtom.bondTypeList.length; ++j) {
          if (currentAtom.bondTypeList[j] === 3) {
            currentAtom.numBonds--;
            currentAtom.bondTypeList[j] = 2;
            let adjacentAtom = network[currentAtom.bondIdList[j]];
            adjacentAtom.numBonds--;
            adjacentAtom.bondTypeList[adjacentAtom.bondIdList.indexOf(currentAtom.id)] = 2;
          }
        }
      }
      break;
    case 38:
      // TODO: several possible products
      for (let i = 0; i < network.length; ++i) {
        let currentAtom = network[i];
        if (currentAtom.deleted || currentAtom.element !== "C") {
          continue;
        }
        for (let j = 0; j < currentAtom.bondTypeList.length; ++j) {
          if (currentAtom.bondTypeList[j] === 3) {
            currentAtom.numBonds--;
            currentAtom.bondTypeList[j] = 2;
            let adjacentAtom = network[currentAtom.bondIdList[j]];
            adjacentAtom.numBonds--;
            adjacentAtom.bondTypeList[adjacentAtom.bondIdList.indexOf(currentAtom.id)] = 2;
          }
        }
      }
      break;
    case 39:
      for (let i = 0; i < network.length; ++i) {
        let currentAtom = network[i];
        if (currentAtom.deleted || currentAtom.element !== "C") {
          continue;
        }
        for (let j = 0; j < currentAtom.bondTypeList.length; ++j) {
          if (currentAtom.bondTypeList[j] === 2 || currentAtom.bondTypeList[j] === 3) {
            // count number of atoms within a region of 1.1 bondLength from the bond on either side
            let adjacentAtom = network[currentAtom.bondIdList[j]];
            let side1 = 0;
            let side2 = 0;
            let bondAngle = currentAtom.findBondAngleWith(adjacentAtom);
            // TODO: yuck, O(n^2)
            for (let k = 0; k < network.length; ++k) {
              let currentAtom2 = network[k];
              if (currentAtom2.distanceToBondOf(currentAtom, adjacentAtom) < 1.1 * bondLength) {
                let side = currentAtom2.sideOfBondOf(currentAtom, adjacentAtom);
                if (side < 0) {
                  side1++;
                } else if (side > 0) {
                  side2++;
                }
              }
            }
            if (side1 > side2) {
              bondAngle = (bondAngle + 60) % 360;
            } else {
              bondAngle = (bondAngle + 300) % 360;
            }
            let newID = nextID;
            currentAtom.bondTypeList[j]--;
            currentAtom.numBonds--;
            currentAtom.addBond("C", 1, false, bondAngle);
            adjacentAtom.bondTypeList[adjacentAtom.bondIdList.indexOf(currentAtom.id)]--;
            adjacentAtom.numBonds--;
            adjacentAtom.createBond(network[newID], 1);
            // does not repeat for alkynes? I think
          }
        }
      }
      break;
    case 40:
      for (let i = 0; i < network.length; ++i) {
        let currentAtom = network[i];
        if (currentAtom.deleted || currentAtom.element !== "C") {
          continue;
        }
        for (let j = 0; j < currentAtom.bondTypeList.length; ++j) {
          currentAtom.alkyneAddition("O","",2,1);
        }
      }
      break;
    case 41:
      for (let i = 0; i < network.length; ++i) {
        let currentAtom = network[i];
        if (currentAtom.deleted || currentAtom.element !== "C") {
          continue;
        }
        for (let j = 0; j < currentAtom.bondTypeList.length; ++j) {
          currentAtom.alkyneAddition("","O",1,2);
        }
      }
      break;
    case 42:
      for (let i = 0; i < network.length; ++i) {
        let currentAtom = network[i];
        if (currentAtom.deleted || currentAtom.element !== "C") {
          continue;
        }
        for (let j = 0; j < currentAtom.bondTypeList.length; ++j) {
          if (currentAtom.bondTypeList[j] === 2 || currentAtom.bondTypeList[j] === 3) {
            // count number of atoms within a region of 1.1 bondLength from the bond on either side
            let adjacentAtom = network[currentAtom.bondIdList[j]];
            let side1 = 0;
            let side2 = 0;
            let bondAngle = currentAtom.findBondAngleWith(adjacentAtom);
            // TODO: yuck, O(n^2)
            for (let k = 0; k < network.length; ++k) {
              let currentAtom2 = network[k];
              if (currentAtom2.distanceToBondOf(currentAtom, adjacentAtom) < 1.1 * bondLength) {
                let side = currentAtom2.sideOfBondOf(currentAtom, adjacentAtom);
                if (side < 0) {
                  side1++;
                } else if (side > 0) {
                  side2++;
                }
              }
            }
            if (side1 > side2) {
              bondAngle = (bondAngle + 60) % 360;
            } else {
              bondAngle = (bondAngle + 300) % 360;
            }
            let newID = nextID;
            currentAtom.bondTypeList[j]--;
            currentAtom.numBonds--;
            currentAtom.addBond("O", 1, false, bondAngle);
            adjacentAtom.bondTypeList[adjacentAtom.bondIdList.indexOf(currentAtom.id)]--;
            adjacentAtom.numBonds--;
            adjacentAtom.createBond(network[newID], 1);
            // does not repeat for alkynes? I think
          }
        }
      }
      break;
    case 43:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAddition("O","O");
      }
      break;
    case 44:
      for (let i = 0; i < network.length; ++i) {
        let currentAtom = network[i];
        if (currentAtom.deleted || currentAtom.element !== "C") {
          continue;
        }
        for (let j = 0; j < currentAtom.bondTypeList.length; ++j) {
          let adjacentAtom = network[currentAtom.bondIdList[j]];
          if (adjacentAtom.element === "C") {
            let bondType = currentAtom.bondTypeList[j];
            if (bondType === 2 || bondType === 3) {
              currentAtom.removeBond(adjacentAtom);
              currentAtom.addBond("O", 2, false);
              adjacentAtom.addBond("O", 2, false);
              if (bondType === 3) {
                currentAtom.addBond("O", 1, false);
                adjacentAtom.addBond("O", 1, false);
              }
            }
          }
        }
      }
      break;
    case 45:
      for (let i = 0; i < network.length; ++i) {
        let currentAtom = network[i];
        if (currentAtom.deleted || currentAtom.element !== "C") {
          continue;
        }
        for (let j = 0; j < currentAtom.bondTypeList.length; ++j) {
          let adjacentAtom = network[currentAtom.bondIdList[j]];
          if (adjacentAtom.element === "C") {
            let bondType = currentAtom.bondTypeList[j];
            if (bondType === 2 || bondType === 3) {
              currentAtom.removeBond(adjacentAtom);
              currentAtom.addBond("O", 2, false);
              adjacentAtom.addBond("O", 2, false);
              if (bondType === 3) {
                currentAtom.addBond("O", 1, false);
                adjacentAtom.addBond("O", 1, false);
              }
              // turn aldehydes into carboxylic acids
              if (currentAtom.numBonds < maxBonds(currentAtom.element)) {
                currentAtom.addBond("O", 1, false);
              }
              if (adjacentAtom.numBonds < maxBonds(adjacentAtom.element)) {
                adjacentAtom.addBond("O", 1, false);
              }
              // do it again to turn formaldehyde into carbonic acid
              if (currentAtom.numBonds < maxBonds(currentAtom.element)) {
                currentAtom.addBond("O", 1, false);
              }
              if (adjacentAtom.numBonds < maxBonds(adjacentAtom.element)) {
                adjacentAtom.addBond("O", 1, false);
              }
            }
          }
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
        network[id1].updateNextBondAngle();
        network[id2].updateNextBondAngle();
        break;
      }
    } else {
      if (!validBond) {
        break;
      } else if (selectedAtom.length !== 0) {
        selectedAtom.element = element;
      } else {
        network.push(new Atom(nextID, element, previewX1, previewY1, 0, false, 0, [], []));
        network[nextID].updateNextBondAngle();
        nextID++;
      }
    }
  }
  renderFrame = true;
  renderMiddleground = true;
}