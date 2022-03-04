// Written by Joseph. github.com/OneRandomGithubUser
const bondLength = 50;
var nextAtomID = 0;
var nextMoleculeID = 0;
var bondType = 1;
var element = "C";
var reagents = "";
var selectedTool = "bond";
var network = []; // array of Atom objects
var molecules = []; // array of Molecule objects
// TODO: new Network object?
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
const minWidth = 900;
const minHeight = 715;
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
var selectedBond = [];
var selectedMolecule = [];
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
  "This website's code has been optimized for readability at the expense of speed - check out the code!",
  "This web app does not yet support stereochemistry, charges, resonance, or E-Z configuration"
];
// TODO: bad practice to make so many global variables

// define the Atom class
// TODO: possible performance improvements by caching functional groups, though too small to worry about right now/*
class Atom {
  constructor(id,element,x,y,numBonds,deleted,predictedNextBondAngle,bondIdList,bondTypeList,moleculeID) {
    this.id = id;
    this.element = element;
    this.x = x;
    this.y = y;
    this.numBonds = numBonds;
    this.deleted = deleted;
    this.predictedNextBondAngle = predictedNextBondAngle;
    this.bondIdList = bondIdList;
    this.bondTypeList = bondTypeList;
    this.moleculeID = moleculeID;
    this.length = -1; // because length doesn't make sense for an atom
  }

  delete() {
    for (let i = 0; i < this.bondIdList.length; i++) {
      let currentAtom = network[i];
      currentAtom.removeBondWith(this);
    }
    molecules[this.moleculeID].removeAtom(this);
    this.deleted = true;
    this.clearData();
    return true;
  }

  clearData() {
    if (!this.deleted) {
      throw new Error("tried to clear data of nondeleted atom");
    }
    this.id = null;
    this.element = null;
    this.x = null;
    this.y = null;
    this.numBonds = null;
    this.predictedNextBondAngle = null;
    this.bondIdList = null;
    this.bondTypeList = null;
    this.moleculeID = null;
  }

  insertAtom(element, bondType, connectToExistingAtoms, optionalBondAngle) {
    if (bondType + this.numBonds > maxBonds(this.element) || bondType > maxBonds(element)) {
      // bond makes too many bonds for a valid molecule
      return false;
    } else {
      let bondAngle;
      if (optionalBondAngle === undefined) {
        bondAngle = this.getNextBondAngleOf(bondType);
      } else {
        bondAngle = optionalBondAngle;
      }
      let closestDestinationAtom = [];
      let previewX2 = this.x + Math.cos(toRadians(360-bondAngle))*bondLength;
      let previewY2 = this.y + Math.sin(toRadians(360-bondAngle))*bondLength;
      let id2 = nextAtomID;
      // connect to an existing atom, ignoring element
      closestDestinationAtom = findClosestDestinationAtom(previewX2,previewY2,[],network);
      if (closestDestinationAtom.length !== 0) {
        if (connectToExistingAtoms && closestDestinationAtom.numBonds + bondType < maxBonds(closestDestinationAtom.element)) {
          // if connectToExistingAtoms is true and the bondType is not too big to addition to the closestDestinationAtom, make the bond to it
          this.createBondWith(closestDestinationAtom, bondType);

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
      network.push(new Atom(id2, element, previewX2, previewY2, 0, false, 0, [], [], -1));
      nextAtomID++;
      this.createBondWith(network[id2], bondType);

      // then update the frame
      renderFrame = true;
      renderMiddleground = true;
      return true;
    }
  }
  
  alkeneAdditionOf(markovnikovElementToAdd, nonmarkovnikovElementToAdd, optionalMarkovnikovNumBondsToAdd = 1, optionalNonmarkovnikovNumBondsToAdd = 1) {
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
                  this.insertAtom(markovnikovElementToAdd, optionalMarkovnikovNumBondsToAdd, false);
                }
                if (nonmarkovnikovElementToAdd != "") {
                  atom2.insertAtom(nonmarkovnikovElementToAdd, optionalNonmarkovnikovNumBondsToAdd, false);
                }
              }
            } else {
              for (let j = 0; j < reps; j++) {
                if (nonmarkovnikovElementToAdd != "") {
                  this.insertAtom(nonmarkovnikovElementToAdd, optionalNonmarkovnikovNumBondsToAdd, false);
                }
                if (markovnikovElementToAdd != "") {
                  atom2.insertAtom(markovnikovElementToAdd, optionalMarkovnikovNumBondsToAdd, false);
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
  
  alkyneAdditionOf(markovnikovElementToAdd, nonmarkovnikovElementToAdd, optionalMarkovnikovNumBondsToAdd = 1, optionalNonmarkovnikovNumBondsToAdd = 1) {
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
                this.insertAtom(markovnikovElementToAdd, optionalMarkovnikovNumBondsToAdd, false);
              }
              if (nonmarkovnikovElementToAdd != "") {
                atom2.insertAtom(nonmarkovnikovElementToAdd, optionalNonmarkovnikovNumBondsToAdd, false);
              }
            } else {
              if (nonmarkovnikovElementToAdd != "") {
                this.insertAtom(nonmarkovnikovElementToAdd, optionalNonmarkovnikovNumBondsToAdd, false);
              }
              if (markovnikovElementToAdd != "") {
                atom2.insertAtom(markovnikovElementToAdd, optionalMarkovnikovNumBondsToAdd, false);
              }
            }
            changed = true;
          }
        }
      }
      return changed;
    }
  }

  createBondWith(atom2, bondType) {
    this.bondIdList.push(atom2.id);
    atom2.bondIdList.push(this.id);
    this.bondTypeList.push(bondType);
    atom2.bondTypeList.push(bondType);
    this.numBonds += bondType;
    atom2.numBonds += bondType;
    this.updateNextBondAngle();
    atom2.updateNextBondAngle();
    // update the molecules as necessary
    if (this.moleculeID === -1) {
      // if the moleculeID is -1, then it is not in any molecule yet
      if (atom2.moleculeID === -1) {
        this.moleculeID = nextMoleculeID;
        atom2.moleculeID = nextMoleculeID;
        molecules.push(new Molecule(nextMoleculeID, Math.min(this.x,atom2.x), Math.min(this.y,atom2.y), Math.max(this.x,atom2.x), Math.max(this.y,atom2.y), false, [this.id, atom2.id]));
        nextMoleculeID++;
      } else {
        molecules[atom2.moleculeID].addNewAtom(this);
      }
    } else {
      if (atom2.moleculeID === -1) {
        molecules[this.moleculeID].addNewAtom(atom2);
      } else {
        if (this.moleculeID !== atom2.moleculeID) {
          // no need to combine identical molecules
          molecules[this.moleculeID].combineWith(molecules[atom2.moleculeID]);
        }
      }
    }
  }

  removeBondWith(atom2) {
    let currentIndex = this.bondIdList.indexOf(atom2.id);
    if (currentIndex !== -1) {
      molecules[this.moleculeID].removeBondBetween(this, atom2);
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

  changeMoleculeNumber(moleculeNumber) {
    molecules[this.moleculeID].changeMoleculeNumber(moleculeNumber);
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
    return this.carbocationStabilityIndex() > atom.carbocationStabilityIndex();
  }

  carbocationStabilityIndex() {
    return this.carbocationStabilityIndexHelper(0);
  }

  carbocationStabilityIndexHelper(index) {
    // TODO: this is a really inefficient algorithm and this is a bad way to handle other carbocations and can get stuck on aromatic rings
    if (this.element != "C") {
      return 0;
    }
    let ans = 0;
    if (index === 0) {
      // if this is the first atom, find the number of bonded atoms, then add anything due to resonance
      ans += this.bondIdList.length;
      for (let i = 0; i < this.bondIdList.length; i++) {
        ans += network[this.bondIdList[i]].carbocationStabilityIndexHelper(index+1);
      }
    } else {
      for (let i = 0; i < this.bondIdList.length; i++) {
        if (this.isBenzene()) {
          // add 4 for the super stable benzene if it's next to the original, otherwise decrease it by half every atom it's away. probably not accurate
          ans+=4/(2**index-1);
        } else if (this.bondTypeList[i] === index % 2 + 1) {
          // bad way to try to account for resonance. add 1/2+1/4+1/8+... for each resonance contributor. probably does not count all resonance
          ans += 1/(2**index);
          ans += network[this.bondIdList[i]].carbocationStabilityIndexHelper(index+1);
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

  isProtectedHydroxyl() {
    return this.element === "OTBS" && this.numBonds === 1 && network[this.bondIdList[0]].element === "C";
  }

  isKetone() { // is ketone or aldehyde
    return this.element === "O" && this.numBonds === 2 && this.bondIdList.length == 1 && network[this.bondIdList[0]].element === "C";
  }

  isLeavingGroup() {
    return (this.element === "Br" || this.element === "Cl" || this.element === "F" || this.element === "I" || this.element === "Ts") && this.numBonds === 1 && this.bondIdList.length == 1 && network[this.bondIdList[0]].element === "C";
  }

  isHalide() {
    return (this.element === "Br" || this.element === "Cl" || this.element === "F" || this.element === "I") && this.numBonds === 1 && this.bondIdList.length == 1 && network[this.bondIdList[0]].element === "C";
  }

  isLithiate() {
    return (this.element === "Li") && this.numBonds === 1 && this.bondIdList.length == 1 && network[this.bondIdList[0]].element === "C";
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

  getNextBondAngleOf(bondType) {
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
      // if optionalPriority is more than the actual number of bonded atoms to the atom, do the default case from the switch statement
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
        // return which of the two possible bond angles 120 degrees away from the current bond angle is flatter (closer to 0 or 180 degrees)
        let answer = (currentBondSectors[0]*30+120)%360
        let alternate = (currentBondSectors[0]*30+240)%360
        if (Math.min(alternate%180,180-(alternate%180)) < Math.min(answer%180,180-(answer%180))) {
          answer = alternate;
        }
        return answer;
      case 2:
        // return the bond angle such that the new bond is in between the two prexisting bonds + 180 degrees (so on the other side)
        if (Math.abs(currentBondAngles[0] - currentBondAngles[1]) > 180) {
          return (Math.floor((currentBondAngles[0]+currentBondAngles[1])/2))%360;
        } else {
          return (Math.floor((currentBondAngles[0]+currentBondAngles[1])/2)+180)%360;
        }
      case 3:
        // return 240 degrees if it won't make the atom crowded, if not return 60 degrees if it won't make the atom crowded, if not just go around the sectors until one is free
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
        // cycle around the sectors until one is empty or you reach 330 degrees. assumes optionalPriority > 3
        let ans = optionalPriority;
        while (currentBondSectors.includes(ans) && ans < 12) {
          ans++;
        }
        ans *= 30;
        return ans;
    }
  }
}

class Molecule {
  constructor(id,x1,y1,x2,y2,deleted,atomIDs) {
    this.id = id;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.deleted = deleted;
    this.atomIDs = atomIDs;
    this.length = -1; // because length doesn't make sense for an atom
  }

  delete() {
    for (let i = 0; i < this.atomIDs.length; i++) {
      let currentAtom = network[i];
      currentAtom.delete();
    }
    this.deleted = true;
    this.clearData();
    return true;
  }

  addNewAtom(atom) {
    if (this.deleted) {
      throw new Error("referenced deleted molecule");
    }
    this.atomIDs.push(atom.id);
    if (atom.x < this.x1) {
      this.x1 = atom.x;
    }
    if (atom.y < this.y1) {
      this.y1 = atom.y;
    }
    if (atom.x > this.x2) {
      this.x2 = atom.x;
    }
    if (atom.y > this.y2) {
      this.y2 = atom.y;
    }
    atom.moleculeID = this.id;
  }

  recalculateBounds() {
    if (this.deleted) {
      throw new Error("referenced deleted molecule");
    }
    if (this.atomIDs.length === 0) {
      throw new Error("tried to recalculate x1 of empty molecule")
    }
    let x1 = network[this.atomIDs[0]].x;
    let y1 = network[this.atomIDs[0]].y;
    let x2 = network[this.atomIDs[0]].x;
    let y2 = network[this.atomIDs[0]].y;
    for (let i = 0; i < this.atomIDs.length; i++) {
      let currentAtom = network[this.atomIDs[i]];
      if (currentAtom.x < x1) {
        x1 = currentAtom.x;
      }
      if (currentAtom.y < y1) {
        y1 = currentAtom.y;
      }
      if (currentAtom.x > x2) {
        x2 = currentAtom.x;
      }
      if (currentAtom.y > y2) {
        y2 = currentAtom.y;
      }
    }
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }

  removeAtom(atom) {
    // removes the atom's branches from itself, then deletes itself
    if (this.deleted) {
      throw new Error("referenced deleted molecule");
    }
    if (atom.deleted) {
      throw new Error("referenced deleted atom - delete atom AFTER molecule.remove(atom)");
    }
    if (!this.atomIDs.includes(atom.id)) {
      throw new Error("tried to remove atom from molecule it's not in");
    }
    this.atomIDs.splice(this.atomIDs.indexOf(atom.id), 1);
    for (let i = 0; i < atom.bondIdList.length; i++) {
      this.removeBondBetween(atom, network[atom.bondIdList[i]]);
    }
    this.delete();
  }

  clearData() {
    if (!this.deleted) {
      throw new Error("tried to clear data of nondeleted molecule");
    }
    this.id = null;
    this.x1 = null;
    this.y1 = null;
    this.x2 = null;
    this.y2 = null;
    this.atomIDs = null;
  }

  combineWith(molecule) {
    if (this.deleted) {
      throw new Error("referenced deleted molecule");
    }
    if (this.id === molecule.id) {
      throw new Error("tried to combine molecule with itself");
    }
    if (molecule.x1 < this.x1) {
      this.x1 = molecule.x1;
    }
    if (molecule.y1 < this.y1) {
      this.y1 = molecule.y1;
    }
    if (molecule.x2 > this.x2) {
      this.x2 = molecule.x2;
    }
    if (molecule.y2 > this.y2) {
      this.y2 = molecule.y2;
    }
    for (let i = 0; i < molecule.atomIDs.length; i++) {
      let currentAtomId = molecule.atomIDs[i];
      this.atomIDs.push(currentAtomId);
      network[currentAtomId].moleculeID = this.id;
    }
    molecule.deleted = true;
  }

  removeBondBetween(atom1, atom2) {
    if (this.deleted) {
      throw new Error("removeBondBetween referenced deleted molecule");
    }
    if (atom1.deleted || atom2.deleted) {
      throw new Error("removeBondBetween referenced deleted atoms");
    }
    if (!atom1.bondIdList.includes(atom2.id)) {
      throw new Error("molecule.removeBondBetween must be called on two atoms that currently have a bond");
    }
    if (this.isBridge(atom1, atom2)) {
      molecules.push(new Molecule(nextMoleculeID, atom2.x, atom2.y, atom2.x, atom2.y, false, []))
      let seenNetwork = {};
      seenNetwork[atom1.id] = true;
      this.removeBondBetweenHelper(atom2, seenNetwork, nextMoleculeID);
      nextMoleculeID++;
      this.recalculateBounds();
    }
    return true;
  }

  removeBondBetweenHelper(atom, seenNetwork, moleculeID) {
    seenNetwork[atom.id] = true;
    atom.moleculeID = moleculeID;
    molecules[nextMoleculeID].addNewAtom(atom);
    this.atomIDs.splice(this.atomIDs.indexOf(atom.id), 1);
    for (let i = 0; i < atom.bondIdList.length; i++) {
      let currentAtom = network[atom.bondIdList[i]];
      if (!seenNetwork[currentAtom.id]) {
        this.removeBondBetweenHelper(currentAtom, seenNetwork, moleculeID);
      }
    }
  }

  isBridge(atom1, atom2) {
    if (this.deleted) {
      throw new Error("isBridge referenced deleted molecule");
    }
    if (atom1.deleted || atom2.deleted) {
      throw new Error("isBridge referenced deleted atoms");
    }
    if (!this.atomIDs.includes(atom1.id) || !this.atomIDs.includes(atom2.id)) {
      throw new Error("isBridge atoms not in molecule");
    }
    let seenNetwork = {};
    seenNetwork[atom1.id] = true;
    seenNetwork[atom2.id] = true;
    let ans = true;
    for (let i = 0; i < atom1.bondIdList.length; i++) {
      let currentAtom = network[atom1.bondIdList[i]];
      if (currentAtom.id === atom2.id) {
        // skip the bond between atom1 and atom2 if it exists
        continue;
      } else {
        // isBridgeHelper returns false if it IS a bridge
        ans = ans && !this.isBridgeHelper(currentAtom, atom2, seenNetwork);
      }
    }
    return ans;
  }

  isBridgeHelper(currentAtom, targetAtom, seenNetwork) {
    seenNetwork[currentAtom.id] = true;
    let ans = false;
    for (let i = 0; i < currentAtom.bondIdList.length; i++) {
      let currentAtom2 = network[currentAtom.bondIdList[i]];
      if (targetAtom.id === currentAtom2.id) {
        return true;
      } else if (!seenNetwork[currentAtom2.id]) {
        ans = ans || this.isBridgeHelper(currentAtom2, targetAtom, seenNetwork);
      }
    }
    return ans;
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
  foreground.textSize(20);
  foreground.textAlign(CENTER, CENTER);
  frameRate(60);
  pixelDensity(1);
  tip = "Tip: "+ tips[Math.floor(Math.random()*tips.length)];
  console.log("Written by Joseph. github.com/OneRandomGithubUser");
}

function draw() {
  try {
    // parseInt so that cachedMouseX and cachedMouseY don't keep changing during rending
    let cachedMouseX = parseInt(mouseX);
    let cachedMouseY = parseInt(mouseY);
    if (hackerman && frameCount%3 === 0) {
      // this is a joke feature. continually clears the frame and then makes a random molecule
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
      // clear the frame only if it is not in the intro or frameCount >= 60 (the !intro is there to prevent checking frameCount every time)
      if (!intro || intro && frameCount >= 60) {
        background(255);
        foreground.clear();
      }

      if (renderMiddleground) {
        middleground.clear();
        middleground.image(background2, 0, 0, windowWidth, windowHeight);
      }

      if (!mousePressed) {
        selectedAtom = [];
        selectedBond = [];
        selectedMolecule = [];
      }

      closestDistance = selectionDistance;
      let closestBondDistance = selectionDistance;
      validBond = true;
      let bondAngle;

      // calculate closest selected atom/bond as long as the mouse is not being dragged
      // TODO: this algorithm can be made much more efficient
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        // don't even consider deleted atoms
        if (currentAtom.deleted) {
          continue;
        }
        if (!mousePressed) {
          // find closest atom
          let distance = Math.sqrt((cachedMouseX-currentAtom.x)**2 + (cachedMouseY-currentAtom.y)**2);
          if (distance < closestDistance) {
            closestDistance = distance;
            selectedAtom = currentAtom;
          }
          if (selectedAtom.length === 0 && selectedTool !== "atom") {
            // find closest bond if there is no closest atom when the selectedTool is bond or drag
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

      if (selectedTool === "moleculeDrag") {
        if (selectedBond.length !== 0) {
          selectedMolecule = molecules[selectedBond[0].moleculeID];
          // should not need to consider selectedBond[1] since they should be in the same molecule
        } else if (selectedAtom.length !== 0) {
          selectedMolecule = molecules[selectedAtom.moleculeID];
        }
      }

      // calculate new bond angle
      if (selectedAtom.length !== 0 && !mousePressed && selectedTool === "bond") {
        // when there is a selectedAtom and the mouse is not being dragged and the bond tool is selected
        if (selectedAtom.numBonds > maxBonds(selectedAtom.element)-bondType) {
          // too many bonds
          validBond = false;
        } else {
          bondAngle = selectedAtom.getNextBondAngleOf(bondType);
        }
        previewX1 = selectedAtom.x;
        previewY1 = selectedAtom.y;
        previewX2 = selectedAtom.x + Math.cos(toRadians(360-bondAngle))*bondLength;
        previewY2 = selectedAtom.y + Math.sin(toRadians(360-bondAngle))*bondLength;
      } else if (selectedAtom.length !== 0 && !mousePressed) {
        // when only one point is selected, not two, when selectedTool is atom or drag
        previewX1 = selectedAtom.x;
        previewY1 = selectedAtom.y;
        if (selectedAtom.numBonds > maxBonds(element)) {
          validBond = false;
        } else {
          bondAngle = 330;
        }
      } else if (mousePressed) {
        // on mouse drag, stop updating previewX1 and previewY1 when selectedTool is bond
        if (selectedTool === "bond") {
          if (angleSnap) {
            if (selectedAtom.numBonds > maxBonds(selectedAtom.element)-bondType) {
              // too many bonds
              validBond = false;
            } else {
              bondAngle = Math.floor((findBondAngle(previewX1,previewY1,cachedMouseX,cachedMouseY)+15)/30)*30;
              // round bond angle to nearest 30 degrees
            }
            previewX2 = previewX1 + Math.cos(toRadians(360-bondAngle))*bondLength;
            previewY2 = previewY1 + Math.sin(toRadians(360-bondAngle))*bondLength;
          } else {
            previewX2 = cachedMouseX;
            previewY2 = cachedMouseY;
            if (selectedAtom.numBonds > maxBonds(selectedAtom.element)-bondType) {
              // too many bonds
              validBond = false;
            } else {
              bondAngle = findBondAngle(previewX1,previewY1,cachedMouseX,cachedMouseY);
            }
          }
        } else if (selectedTool === "atomDrag" || selectedTool === "moleculeDrag") {
            // when mouse is dragged, edit the position of the selectedAtom or selectedBond
            let diffX = cachedMouseX - previousMouseX;
            let diffY = cachedMouseY - previousMouseY;
            if (selectedTool === "atomDrag") {
              if (selectedBond.length !== 0) {
                selectedBond[0].x += diffX;
                selectedBond[0].y += diffY;
                selectedBond[1].x += diffX;
                selectedBond[1].y += diffY;
              } else {
                selectedAtom.x += diffX;
                selectedAtom.y += diffY;
              }
            } else {
              // selectedTool is moleculeDrag
              if (selectedMolecule.length !== 0){
                selectedMolecule.x1 += diffX;
                selectedMolecule.y1 += diffY;
                selectedMolecule.x2 += diffX;
                selectedMolecule.y2 += diffY;
                for (let i = 0; i < selectedMolecule.atomIDs.length; i++) {
                  let currentAtom = network[selectedMolecule.atomIDs[i]];
                  currentAtom.x += diffX;
                  currentAtom.y += diffY;
                }
              }
            }
          previewX1 = cachedMouseX;
          previewX2 = cachedMouseY;
            // TODO: snap if the selectedAtom is now within an acceptable distance from one of its bonded atoms
        } else {
          // selectedTool is moleculeDrag
        }
      } else {
        // no selectedAtom
        previewX1 = cachedMouseX;
        previewY1 = cachedMouseY;
        bondAngle = 330;
        previewX2 = cachedMouseX + Math.cos(toRadians(360-bondAngle))*bondLength;
        previewY2 = cachedMouseY + Math.sin(toRadians(360-bondAngle))*bondLength;
      }

      if (renderMiddleground) {
        // render bonds
        middleground.stroke(0);
        for (let i = 0; i < network.length; i++) {
          let currentAtom = network[i];
          if (currentAtom.deleted) {
            continue;
          }
          if (currentAtom.numBonds !== 0) {
            for (let j = 0; j < currentAtom.bondIdList.length; j++) {
              // only draw it if it's a bond from a lesser ID to a greater ID. prevents drawing the bond twice (since bonds don't go from atoms to themselves)
              if (currentAtom.bondIdList[j] > currentAtom.id) {
                let adjacentAtom = network[currentAtom.bondIdList[j]];
                if (!adjacentAtom.deleted) {
                  bond(currentAtom.x, currentAtom.y, adjacentAtom.x, adjacentAtom.y, currentAtom.bondTypeList[j], middleground);
                }
              }
            }
          }
        }
        // render atoms
        middleground.noStroke();
        for (let i = 0; i < network.length; i++) {
          let currentAtom = network[i];
          if (currentAtom.deleted) {
            continue;
          }
          let label = currentAtom.element;
          // account for the atom's charge, asumming it has hydrogens if it makes sense to assume so
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
                break;
              case 4:
                label = "N⁺"
                break;
            }
          } else if ((label === "Br" || label === "Cl" || label === "I" || label === "F" || label === "Ts") && currentAtom.numBonds === 0) {
            label += "⁻";
          }
          if (label !== "") {
            middleground.fill(255);
            let boundingBox = font.textBounds(label, currentAtom.x, currentAtom.y, 20, CENTER, CENTER);
            middleground.rect(boundingBox.x-5-boundingBox.w/2, boundingBox.y-5+boundingBox.h/2, boundingBox.w+10, boundingBox.h+10); // TODO: figure out why this is so weird, especially with H2O
            middleground.fill(0);
            middleground.text(label, currentAtom.x, currentAtom.y);
          }
        }
      }
      
      // render cyan/red selection dot
      if (selectedAtom.length !== 0 && selectedTool !== "moleculeDrag") {
        if (!validBond) {
          foreground.fill(255,0,0);
          validBond = false;
        } else {
          foreground.fill(48,227,255);
          validBond = true;
        }
        foreground.circle(selectedAtom.x,selectedAtom.y,10);
        foreground.fill(255);
      }

      // highlight selected bond when selectedTool is bond or atom drag
      if (selectedAtom.length === 0 && selectedBond.length !== 0 && (selectedTool === "bond" || selectedTool === "atomDrag")) {
        let color;
        if (selectedTool === "bond" && (selectedBond[0].numBonds - selectedBond[2] + bondType > maxBonds(selectedBond[0].element) || selectedBond[1].numBonds - selectedBond[2] + bondType > maxBonds(selectedBond[1].element))) {
          // don't change selected bond if it would cause too many bonds only when the selectedTool is bond
          color = [255,0,0];
          highlightedBond(selectedBond[0].x, selectedBond[0].y, selectedBond[1].x, selectedBond[1].y, selectedBond[2], color, foreground);
          if (selectedTool === "bond") {
            bond(selectedBond[0].x, selectedBond[0].y, selectedBond[1].x, selectedBond[1].y, bondType, foreground);
          }
          selectedBond = [];
        } else {
          color = [48,227,255];
          highlightedBond(selectedBond[0].x, selectedBond[0].y, selectedBond[1].x, selectedBond[1].y, selectedBond[2], color, foreground);
          if (selectedTool === "bond") {
            bond(selectedBond[0].x, selectedBond[0].y, selectedBond[1].x, selectedBond[1].y, bondType, foreground);
          }
        }
        validBond = false;
      } else {
        selectedBond = [];
      }

      // highlight selected molecule when selectedTool is moleculeDrag
      if (selectedTool === "moleculeDrag" && selectedMolecule.length !== 0) {
        foreground.strokeWeight(3);
        foreground.noFill();
        foreground.rect(selectedMolecule.x1, selectedMolecule.y1, selectedMolecule.x2-selectedMolecule.x1, selectedMolecule.y2-selectedMolecule.y1);
        foreground.stroke(48,227,255);
        foreground.fill(48,227,255);
        for (let i = 0; i < selectedMolecule.atomIDs.length; i++) {
          let currentAtom = network[selectedMolecule.atomIDs[i]];
          // don't even consider deleted atoms
          if (currentAtom.deleted) {
            continue;
          }
            // render preexisting bonds
            if (currentAtom.numBonds !== 0) {
              for (let j = 0; j < currentAtom.bondIdList.length; j++) {
                // only draw it if it's a bond from a lesser ID to a greater ID. prevents drawing the bond twice (since bonds don't go from atoms to themselves)
                if (currentAtom.bondIdList[j] > currentAtom.id) {
                  let adjacentAtom = network[currentAtom.bondIdList[j]];
                  if (!adjacentAtom.deleted) {
                    bond(currentAtom.x, currentAtom.y, adjacentAtom.x, adjacentAtom.y, currentAtom.bondTypeList[j], foreground);
                  }
                }
              }
            }
            
            // render preexisting atoms
            if (currentAtom.deleted) {
              continue; // deleted atom
            } else {
            foreground.noStroke();
              let label = currentAtom.element;
              // account for the atom's charge, asumming it has hydrogens if it makes sense to assume so
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
                    break;
                  case 4:
                    label = "N⁺"
                    break;
                }
              } else if ((label === "Br" || label === "Cl" || label === "I" || label === "F" || label === "Ts") && currentAtom.numBonds === 0) {
                label += "⁻";
              }
              if (label !== "") {
                foreground.fill(255);
                let boundingBox = font.textBounds(label, currentAtom.x, currentAtom.y, 20, CENTER, CENTER);
                foreground.rect(boundingBox.x-5-boundingBox.w/2, boundingBox.y-5+boundingBox.h/2, boundingBox.w+10, boundingBox.h+10); // TODO: figure out why this is so weird, especially with H2O
                foreground.fill(48,227,255);
                foreground.text(label, currentAtom.x, currentAtom.y);
              }
            foreground.stroke(48,227,255);
            }
          }
        foreground.fill(0);
        foreground.strokeWeight(1);
        foreground.stroke(0);
      }
      if (selectedTool === "bond") {
        // calculate destination atom
        destinationAtom = findClosestDestinationAtom(previewX2,previewY2,selectedAtom,network);

        // render cyan/red destination dot
        if (destinationAtom.length !== 0) {
          previewX2 = destinationAtom.x;
          previewY2 = destinationAtom.y;
          if (selectedAtom.length === 0) {
            // if selectedAtom does not exist, snap previewX1 and previewY1
            previewX1 = previewX2 - bondLength * Math.cos(toRadians(bondAngle));
            previewY1 = previewY2 + bondLength * Math.sin(toRadians(bondAngle));
          } else {
            bondAngle = findBondAngle(previewX1,previewY1,previewX2,previewY2);
          }
          if (destinationAtom.numBonds <= maxBonds(destinationAtom.element)-bondType && validBond) {
            foreground.fill(48,227,255);
            foreground.circle(destinationAtom.x,destinationAtom.y,10);
            foreground.fill(255);
          } else {
            // invalid destination atom
            foreground.fill(255,0,0);
            foreground.circle(destinationAtom.x,destinationAtom.y,10);
            foreground.fill(255);
            validBond = false;
          }
        }
      }

      // draw preview
      if (selectedTool === "atom") {
        foreground.rectMode(CENTER);
        foreground.fill(0);
        foreground.noStroke();
        foreground.textSize(20);
        foreground.text(element, previewX1, previewY1);
        foreground.fill(255);
        foreground.stroke(0);
        foreground.rectMode(CORNER);
      } else if (validBond && selectedTool === "bond") {
        bond(previewX1, previewY1, previewX2, previewY2, bondType, foreground);
      }

      if (renderMiddleground) {
        renderMiddleground = false;
      }
      // copy buffers to screen
      image(middleground, 0, 0, windowWidth, windowHeight);
      image(foreground, 0, 0, windowWidth, windowHeight);
    }
    // render the intro screen
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
          // no need to render the intro while it's at full opacity
          renderFrame = true;
          renderMiddleground = true;
        }
        if (frameCount === 1 || frameCount > 60) {
          foreground.textSize(144);
          foreground.text("KyneDraw",0,windowHeight/2,windowWidth);
          foreground.textSize(36);
          foreground.text(tip,0,windowHeight*3/4,windowWidth)
          foreground.textSize(20);
          foreground.stroke(0);
          image(foreground, 0, 0, windowWidth, windowHeight);
        }
      } else if (frameCount >= 120) {
        intro = false;
      }
    } else {
    // pause rendering during inactivity and when not in intro
      if (previousMouseX === cachedMouseX && previousMouseY === cachedMouseY) {
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
  renderMiddleground = true;
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
    if (!currentAtom.deleted) {
      distance = Math.sqrt((x-currentAtom.x)**2 + (y-currentAtom.y)**2);
      if (distance < destinationDistance && distance < closestDistance && validBond) {
        if (selectedAtom.length !== 0) {
          // check if the currentAtom is already bonded to the selectedAtom
          for (let j = 0; j < selectedAtom.bondIdList.length; j++) {
            if (selectedAtom.bondIdList[j] === currentAtom.id) {
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
    foreground.textSize(20);
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
  if (element === "C" || element === "N") {
    return 4;
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
    case -1:
      // -1 is when the dropdown menu heading is clicked, so do nothing
      break;
    case 1:
      bondType = selectedBox;
      selectedTool = "bond";
      break;
    case 2:
      bondType = selectedBox;
      selectedTool = "bond";
      break;
    case 3:
      bondType = selectedBox;
      selectedTool = "bond";
      break;
    case 4:
      angleSnap = false;
      break;
    case 5:
      angleSnap = true;
      break;
    case 6:
      element = "C"
      selectedTool = "atom";
      break;
    case 7:
      element = "O"
      selectedTool = "atom";
      break;
    case 8:
      element = "N"
      selectedTool = "atom";
      break;
    case 9:
      element = "Br"
      selectedTool = "atom";
      break;
    case 10:
      element = "Cl"
      selectedTool = "atom";
      break;
    case 11:
      network = [];
      molecules = [];
      nextAtomID = 0;
      nextMoleculeID = 0;
      break;
    case 12:
      let startingID = nextAtomID;
      let x = windowWidth/2+(Math.random()-0.5)*windowWidth/5;
      let y = windowHeight/2+(Math.random()-0.5)*windowHeight/5;
      network.push(new Atom(nextAtomID, "C", x, y, 0, false, 330, [], [], nextMoleculeID));
      molecules.push(new Molecule(nextMoleculeID, x, y, x, y, false, [nextAtomID]));
      nextAtomID++;
      nextMoleculeID++;
      let generating = true;
      let randomAtom;
      let randomNum;
      let randomElement;
      let randomBondNumber;
      while (generating) {
        randomAtom = network[startingID + Math.floor(Math.random() * (nextAtomID-startingID))];
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
        randomAtom.insertAtom(randomElement, randomBondNumber, true);
        if (Math.random() > 0.9) {
          generating = false;
        }
      }
      break;
    case 13:
      hackerman = !hackerman;
      break;
    case 14:
      selectedTool = "atomDrag";
      break;
    case 15:
      selectedTool = "moleculeDrag";
      break;
    case 19:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        } 
        currentAtom.alkeneAdditionOf("O","");
      }
      break;
    case 20:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAdditionOf2("O","",2,1);
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
          let mostSubstitutedAtom = [];
          for (let j = 0; j < adjacentAtom.bondIdList.length; j++) { // look at the atoms attached to the adjacentAtom
            let adjacentAdjacentAtom = network[adjacentAtom.bondIdList[j]];
            if (adjacentAdjacentAtom.element != "C" || adjacentAdjacentAtom.id === currentAtom.id || adjacentAdjacentAtom.numBonds >= maxBonds(adjacentAdjacentAtom.element)) {
              continue;
            } else if (mostSubstitutedAtom.length === 0 || adjacentAdjacentAtom.isMoreSubstitutedThan(mostSubstitutedAtom)) {
              mostSubstitutedAtom = adjacentAdjacentAtom; // TODO: consider what happens when equally substituted
            }
          }
          if (mostSubstitutedAtom.length !== 0) {
            // remove hydroxyl group (currentAtom)
            adjacentAtom.removeBondWith(currentAtom);
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
                adjacentAtom.bondTypeList[j]++;
                adjacentAtom.numBonds++;
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
        currentAtom.alkeneAdditionOf("Br","");
      }
      break;
    case 24:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAdditionOf("","Br");
      }
      break;
    case 25:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAdditionOf("Br","Br");
      }
      break;
    case 26:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAdditionOf("O","Br");
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
        currentAtom.alkeneAdditionOf("O","O");
      }
      break;
    case 29:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        currentAtom.alkeneAdditionOf("","O");
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
        currentAtom.alkeneAdditionOf("O","");
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
          adjacentAtom1.createBondWith(adjacentAtom2, 2);
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
            let newID = nextAtomID;
            currentAtom.bondTypeList[j]--;
            currentAtom.numBonds--;
            currentAtom.insertAtom("C", 1, false, bondAngle);
            adjacentAtom.bondTypeList[adjacentAtom.bondIdList.indexOf(currentAtom.id)]--;
            adjacentAtom.numBonds--;
            adjacentAtom.createBondWith(network[newID], 1);
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
          currentAtom.alkyneAdditionOf("O","",2,1);
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
          currentAtom.alkyneAdditionOf("","O",1,2);
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
          if (currentAtom.bondTypeList[j] === 2) {
            // only occurs for alkenes, count number of atoms within a region of 1.1 bondLength from the bond on either side
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
            let newID = nextAtomID;
            currentAtom.bondTypeList[j]--;
            currentAtom.numBonds--;
            currentAtom.insertAtom("O", 1, false, bondAngle);
            adjacentAtom.bondTypeList[adjacentAtom.bondIdList.indexOf(currentAtom.id)]--;
            adjacentAtom.numBonds--;
            adjacentAtom.createBondWith(network[newID], 1);
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
        currentAtom.alkeneAdditionOf("O","O");
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
              currentAtom.removeBondWith(adjacentAtom);
              currentAtom.insertAtom("O", 2, false);
              adjacentAtom.insertAtom("O", 2, false);
              if (bondType === 3) {
                currentAtom.insertAtom("O", 1, false);
                adjacentAtom.insertAtom("O", 1, false);
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
              currentAtom.removeBondWith(adjacentAtom);
              currentAtom.insertAtom("O", 2, false);
              adjacentAtom.insertAtom("O", 2, false);
              if (bondType === 3) {
                currentAtom.insertAtom("O", 1, false);
                adjacentAtom.insertAtom("O", 1, false);
              }
              // turn aldehydes into carboxylic acids
              if (currentAtom.numBonds < maxBonds(currentAtom.element)) {
                currentAtom.insertAtom("O", 1, false);
              }
              if (adjacentAtom.numBonds < maxBonds(adjacentAtom.element)) {
                adjacentAtom.insertAtom("O", 1, false);
              }
              // do it again to turn formaldehyde into carbonic acid
              if (currentAtom.numBonds < maxBonds(currentAtom.element)) {
                currentAtom.insertAtom("O", 1, false);
              }
              if (adjacentAtom.numBonds < maxBonds(adjacentAtom.element)) {
                adjacentAtom.insertAtom("O", 1, false);
              }
            }
          }
        }
      }
      break;
    case 46:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isHalide()) {
          currentAtom.element = "Mg" + currentAtom.element;
        }
      }
      break;
    case 47:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isHalide()) {
          currentAtom.element = "Li";
        }
      }
      break;
    case 48:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isLithiate()) {
          currentAtom.element = "CuLi×2";
        }
      }
      break;
    case 49:
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
    case 50:
      // TODO: finish this
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
          // turn aldehyde into carboxylic acid
          if (adjacentAtom.numBonds < maxBonds(adjacentAtom.element)) {
            adjacentAtom.insertAtom("O", 1, false);
          }
        }
      }
      break;
    case 51:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isHydroxyl()) {
          currentAtom.element = "OTBS";
        }
      }
      break;
    case 52:
      for (let i = 0; i < network.length; i++) {
        let currentAtom = network[i];
        if (currentAtom.deleted) {
          continue;
        }
        if (currentAtom.isProtectedHydroxyl()) {
          currentAtom.element = "O";
        }
      }
      break;
    case 0: // when no box is selected
    if (selectedTool === "bond") {
      element = "C";
      // -1 means invalid bond TODO: change this, bondAngle is not needed elsewhere anymore
      if (selectedAtom.length === 0 && selectedBond.length !== 0 && selectedBond[2] !== bondType) {
        // TODO: unoptimized
        // change number of bonds between two atoms if there is a selectedBond
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
      } else if (!validBond) {
        // invalid bond
        return false;
      } else {
        // create new atoms if necessary, then create a bond between the two atoms
        // doesn't use insertAtom because the behavior should be the same as seen on the preview
        let atom1;
        let atom2;
        if (selectedAtom.length !== 0) {
          atom1 = selectedAtom;
        } else {
          network.push(new Atom(nextAtomID, element, previewX1, previewY1, 0, false, 0, [], [], -1));
          atom1 = network[nextAtomID];
          nextAtomID++;
        }
        if (destinationAtom.length !== 0) {
          atom2 = destinationAtom;
        } else {
          network.push(new Atom(nextAtomID, element, previewX2, previewY2, 0, false, 0, [], [], -1));
          atom2 = network[nextAtomID];
          nextAtomID++;
        }
        atom1.createBondWith(atom2, bondType);
        // the molecule IDs are handled in createBondWith
        break;
      }
    } else if (selectedTool === "atom") {
      if (!validBond) {
        break;
      } else if (selectedAtom.length !== 0) {
        selectedAtom.element = element;
      } else {
        network.push(new Atom(nextAtomID, element, previewX1, previewY1, 0, false, 0, [], [], nextMoleculeID));
        molecules.push(new Molecule(nextMoleculeID, previewX1, previewY1, previewX1, previewY1, false, [nextAtomID]));
        network[nextAtomID].updateNextBondAngle();
        nextAtomID++;
        nextMoleculeID++;
      }
    }
  }
  renderFrame = true;
  renderMiddleground = true;
}