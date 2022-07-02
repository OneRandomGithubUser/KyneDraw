#include <emscripten/val.h>
#include <emscripten/bind.h>
#include <emscripten/emscripten.h>
#include <string>
#include <cmath>
#include <numbers>
#include <unordered_map>
#include <boost/uuid/uuid.hpp>            // uuid class
#include <boost/uuid/uuid_generators.hpp> // uuid generators
/*
#include <boost/functional/hash.hpp>
#include <boost/geometry.hpp>
#include <boost/geometry/geometries/point.hpp>
#include <boost/geometry/geometries/segment.hpp>
#include <boost/geometry/index/rtree.hpp>*/
#include <iostream>
#include <boost/uuid/uuid_io.hpp>         // uuid streaming operators
// #include <fstream>
// #include <boost/json.hpp>                    // parse JSON

// debug imports

// once CMake adds full support for importing C++20 headers, the below #include can be deleted
#include "kynedraw.h"
//import kynedraw;

namespace kynedraw
{
  class Molecule;
  class VisibleMolecule;

  class Molecule {
    //
  };

  namespace settings
  {
    int FRAME_COUNT = 0;
    double DEADZONE_RADIUS = 5;
    double BOND_LENGTH = 50;
    double MOUSE_SNAP_RADIUS = 15;
    double DESTINATION_SNAP_RADIUS = 5;
    bool SHOW_CARBONS = false;
    bool SNAP_ANGLES;
    bool SNAP_BOND_LENGTHS;
    std::string SELECTED_TOOL;
    double NODE_LABEL_MARGIN = 2;
  }
}

/*{
  {"bonds", -1},
  {"single", 1},
  {"double", 2},
  {"triple", 3},
  {"atoms", -1},
  {"carbon", 6},
  {"oxygen", 7},
  {"nitrogen", 8},
  {"bromine", 9},
  {"chlorine", 10},
  {"sulfur", -6},
  {"drag-delete-tools", -1},
  {"atom-bond-drag", 14},
  {"molecule-drag", 15},
  {"atom-bond-delete", 16},
  {"molecule-delete", 17},
  {"charge-h-tools", -1},
  {"add-charge", -2},
  {"subtract-charge", -3},
  {"add-h", -4},
  {"subtract-h", -5},
  {"snap", 5},
  {"freeform", 4},
  {"clear", 11},
  {"random", 12},
  {"hackerman", 13},
  {"sn-e", -1},
  {"alkene-addition", -1},
  {"ring-metathesis", 36},
  {"hbr-addition", 23},
  {"radical-hbr", 24},
  {"halogenation", 25},
  {"halohydrin-formation", 26},
  {"hydrogenation", 27},
  {"cis-hydrogenation", 37},
  {"trans-hydrogenation", 38},
  {"cyclopropanation", 39},
  {"alkene-oxidation", -1},
  {"acid-hydration", 19},
  {"oxymercuration", 28},
  {"hydroboration", 35},
  {"alkyne-hydration", 40},
  {"alkyne-hydroboration", 41},
  {"epoxidation", 42},
  {"dihydroxylation", 43},
  {"wacker-oxidation", 20},
  {"ozonolysis", 44},
  {"oxidative-cleavage", 45},
  {"alcohol-reactions", -1},
  {"gringard-formation", 46},
  {"organolithiate-formation", 47},
  {"organocopper-formation", 48},
  {"dehydration", 21},
  {"weak-reduction", 30},
  {"strong-reduction", 49},
  {"weak-oxidation", 31},
  {"jones-oxidation", 50},
  {"bromination", 32},
  {"chlorination", 33},
  {"tosylation", 34},
  {"hydroxyl-protection", 51},
  {"hydroxyl-unprotection", 52}
};*/

const std::unordered_map<std::string, int> buttonIDs = {
    {"bonds", -1},
    {"single", 10},
    {"double", 11},
    {"triple", 12},
    {"atoms", -2},
    {"hydrogen", 20},
    {"carbon", 21},
    {"oxygen", 22},
    {"nitrogen", 23},
    {"bromine", 24},
    {"chlorine", 25},
    {"sulfur", 26},
    {"drag-delete-tools", -3},
    {"atom-bond-drag", 30},
    {"molecule-drag", 31},
    {"atom-bond-delete", 32},
    {"molecule-delete", 33},
    {"charge-h-tools", -4},
    {"add-charge", 40},
    {"subtract-charge", 41},
    {"add-h", 42},
    {"subtract-h", 43},
    {"snap", 200},
    {"freeform", 201},
    {"clear", 202},
    {"random", 203},
    {"hackerman", 204},
    {"sn-e", -10},
    {"alkene-addition", -11},
    {"ring-metathesis", 111},
    {"hbr-addition", 112},
    {"radical-hbr", 113},
    {"halogenation", 114},
    {"halohydrin-formation", 115},
    {"hydrogenation", 116},
    {"cis-hydrogenation", 117},
    {"trans-hydrogenation", 118},
    {"cyclopropanation", 119},
    {"alkene-oxidation", -12},
    {"acid-hydration", 120},
    {"oxymercuration", 121},
    {"hydroboration", 122},
    {"alkyne-hydration", 123},
    {"alkyne-hydroboration", 124},
    {"epoxidation", 125},
    {"dihydroxylation", 126},
    {"wacker-oxidation", 127},
    {"ozonolysis", 128},
    {"oxidative-cleavage", 129},
    {"alcohol-reactions", -13},
    {"gringard-formation", 130},
    {"organolithiate-formation", 131},
    {"organocopper-formation", 132},
    {"dehydration", 133},
    {"weak-reduction", 134},
    {"strong-reduction", 135},
    {"weak-oxidation", 136},
    {"jones-oxidation", 137},
    {"bromination", 138},
    {"chlorination", 139},
    {"tosylation", 140},
    {"hydroxyl-protection", 141},
    {"hydroxyl-unprotection", 142}
};
const double pi = std::numbers::pi;
boost::uuids::random_generator uuidGenerator;

kynedraw::Graph network;
kynedraw::Preview preview;

void Render(kynedraw::Graph& graph, emscripten::val canvas)
{
  const static std::string subscript[10] = {"₀","₁","₂","₃","₄","₅","₆","₇","₈","₉"};
  const static std::string superscript[10] = {"⁰","¹","²","³","⁴","⁵","⁶","⁷","⁸","⁹"};
  // NOTE: this may cause an error if a feature specific to kynedraw::Preview is used
  emscripten::val ctx = canvas.call<emscripten::val>("getContext", emscripten::val("2d"));
  ctx.call<void>("clearRect", 0, 0, canvas["width"], canvas["height"]);
  ctx.call<void>("beginPath");
  for (const auto& [uuid, currentVisibleBond] : graph.get_visible_bonds())
  {
    kynedraw::VisibleNode& firstNode = currentVisibleBond.get_node(0);
    kynedraw::VisibleNode& secondNode = currentVisibleBond.get_node(1);
    ctx.call<void>("moveTo", firstNode.get_x(), firstNode.get_y());
    ctx.call<void>("lineTo", secondNode.get_x(), secondNode.get_y());
  }
  ctx.call<void>("stroke");
  for (const auto& [uuid, currentVisibleNode] : graph.get_visible_nodes())
  {
    std::string name = currentVisibleNode.get_name();
    if (name != "C" || kynedraw::settings::SHOW_CARBONS || currentVisibleNode.get_num_bonds() == 0)
    {
      std::string label = name;
      int numH = currentVisibleNode.get_num_h();
      if (numH > 0) {
        if (numH > 1) {
          std::string temp = "";
          int tens = numH;
          while (tens != 0)
          {
            temp = subscript[tens%10] + temp;
            tens = floor(tens/10);
          }
          if (name == "O" || name == "S")
          {
            label = "H" + temp + label;
          } else {
            label += ("H" + temp);
          }
        } else if (name == "Br" || name == "Cl" || name == "I" || name == "F")
        {
          label = "H" + label;
        } else {
          label += "H";
        }
      }
      int charge = currentVisibleNode.get_charge();
      if (abs(charge) > 1) {
        std::string temp = "";
        int tens = abs(charge);
        while (tens != 0) {
          temp = superscript[tens%10] + temp;
          tens = floor(tens/10);
        }
        label += temp;
      }
      if (charge > 0) {label += "⁺";}
      if (charge < 0) {label += "⁻";}
      double x = currentVisibleNode.get_x();
      double y = currentVisibleNode.get_y();
      emscripten::val TextMetrics = ctx.call<emscripten::val>("measureText", emscripten::val(label));
      double left = TextMetrics["actualBoundingBoxLeft"].as<double>() + kynedraw::settings::NODE_LABEL_MARGIN;
      double right = TextMetrics["actualBoundingBoxRight"].as<double>() + kynedraw::settings::NODE_LABEL_MARGIN;
      double up = TextMetrics["actualBoundingBoxAscent"].as<double>() + kynedraw::settings::NODE_LABEL_MARGIN;
      double down = TextMetrics["actualBoundingBoxDescent"].as<double>() + kynedraw::settings::NODE_LABEL_MARGIN;
      ctx.call<void>("clearRect", x-left, y-up, left+right, up+down);
      ctx.call<void>("fillText", label, x, y);
    }
    ctx.call<void>("beginPath");
    ctx.call<void>("arc", currentVisibleNode.get_x(), currentVisibleNode.get_y(), kynedraw::settings::MOUSE_SNAP_RADIUS, 0, 2 * pi);
    ctx.call<void>("stroke");
  }
}
void RenderBackground(double DOMHighResTimeStamp)
{
  emscripten::val document = emscripten::val::global("document");
  Render(network, document.call<emscripten::val>("getElementById", emscripten::val("canvas-background")));
}

void RenderForeground(double DOMHighResTimeStamp)
{
  emscripten::val document = emscripten::val::global("document");
  Render(preview, document.call<emscripten::val>("getElementById", emscripten::val("canvas-foreground")));

  kynedraw::settings::FRAME_COUNT++;
}

void AddButtonEventListeners(emscripten::val element, emscripten::val index, emscripten::val array)
{
  element.call<void>("addEventListener", emscripten::val("mousedown"), emscripten::val::module_property("ClickButton"));
  element.call<void>("addEventListener", emscripten::val("mouseup"), emscripten::val::module_property("ClickButton"));
}

void AddToolButtonEventListener(emscripten::val element, emscripten::val index, emscripten::val array)
{
  element.call<void>("addEventListener", emscripten::val("mouseup"), emscripten::val::module_property("StoreSelectedTool"));
}

void StoreSelectedTool(emscripten::val event)
{
  emscripten::val localStorage = emscripten::val::global("localStorage");
  localStorage.call<void>("setItem", emscripten::val("selectedTool"), event["target"]["id"]);
}

void AddBondSnapButtonEventListener(emscripten::val element, emscripten::val index, emscripten::val array)
{
  element.call<void>("addEventListener", emscripten::val("mouseup"), emscripten::val::module_property("StoreAngleSnapSetting"));
  element.call<void>("addEventListener", emscripten::val("mouseup"), emscripten::val::module_property("StoreBondLengthSnapSetting"));
}

void StoreAngleSnapSetting(emscripten::val event)
{
  emscripten::val localStorage = emscripten::val::global("localStorage");
  localStorage.call<void>("setItem", emscripten::val("snapAngles"), event["target"]["id"]);
}
void StoreBondLengthSnapSetting(emscripten::val event)
{
  emscripten::val localStorage = emscripten::val::global("localStorage");
  localStorage.call<void>("setItem", emscripten::val("snapBondLengths"), event["target"]["id"]);
}
void ResetPreview(std::string tool, double pageX, double pageY)
{
  switch (buttonIDs.at(tool)) {
    case 10: {
      // single
      preview.clear();
      boost::uuids::uuid uuid;
      uuid = uuidGenerator();
      kynedraw::Node& node1 = preview.create_node(uuid, "C");
      kynedraw::VisibleNode& visibleNode1 = preview.create_visible_node(uuid, "C", pageX, pageY);
      preview.set_mouse_node(visibleNode1);
      uuid = uuidGenerator();
      kynedraw::Node& node2 = preview.create_node(uuid, "C");
      kynedraw::VisibleNode& visibleNode2 = preview.create_visible_node(uuid,
                                                                        "C",
                                                                        pageX + kynedraw::settings::BOND_LENGTH * std::cos(pi * kynedraw::settings::FRAME_COUNT / 6),
                                                                        pageY + kynedraw::settings::BOND_LENGTH * std::sin(pi * kynedraw::settings::FRAME_COUNT / 6));
      uuid = uuidGenerator();
      preview.create_bond_between(uuid, 1, node1, node2);
      auto& visibleBond = preview.create_visible_bond_between(uuid, 1, visibleNode1, visibleNode2);
      preview.set_mouse_bond(visibleBond);
      break;
    }
    case 11: {
      // double
      preview.clear();
      boost::uuids::uuid uuid;
      uuid = uuidGenerator();
      kynedraw::Node& node1 = preview.create_node(uuid, "C");
      kynedraw::VisibleNode& visibleNode1 = preview.create_visible_node(uuid, "C", pageX, pageY);
      preview.set_mouse_node(visibleNode1);
      uuid = uuidGenerator();
      kynedraw::Node& node2 = preview.create_node(uuid, "C");
      kynedraw::VisibleNode& visibleNode2 = preview.create_visible_node(uuid,
                                                                        "C",
                                                                        pageX + kynedraw::settings::BOND_LENGTH * std::cos(pi * 11 / 6),
                                                                        pageY + kynedraw::settings::BOND_LENGTH * std::sin(pi * 11 / 6));
      uuid = uuidGenerator();
      preview.create_bond_between(uuid, 2, node1, node2);
      auto& visibleBond = preview.create_visible_bond_between(uuid, 2, visibleNode1, visibleNode2);
      preview.set_mouse_bond(visibleBond);
      break;
    }
    case 12: {
      // triple
      preview.clear();
      boost::uuids::uuid uuid;
      uuid = uuidGenerator();
      kynedraw::Node& node1 = preview.create_node(uuid, "C");
      kynedraw::VisibleNode& visibleNode1 = preview.create_visible_node(uuid, "C", pageX, pageY);
      preview.set_mouse_node(visibleNode1);
      uuid = uuidGenerator();
      kynedraw::Node& node2 = preview.create_node(uuid, "C");
      kynedraw::VisibleNode& visibleNode2 = preview.create_visible_node(uuid,
                                                                        "C",
                                                                        pageX + kynedraw::settings::BOND_LENGTH * std::cos(pi * 11 / 6),
                                                                        pageY + kynedraw::settings::BOND_LENGTH * std::sin(pi * 11 / 6));
      uuid = uuidGenerator();
      preview.create_bond_between(uuid, 3, node1, node2);
      auto& visibleBond = preview.create_visible_bond_between(uuid, 3, visibleNode1, visibleNode2);
      preview.set_mouse_bond(visibleBond);
      break;
    }
    case 20: {
      // hydrogen
      preview.clear();
      boost::uuids::uuid uuid;
      uuid = uuidGenerator();
      preview.create_node(uuid, "H");
      kynedraw::VisibleNode& node = preview.create_visible_node(uuid, "H", pageX, pageY);
      preview.set_mouse_node(node);
      break;
    }
    case 21: {
      // carbon
      preview.clear();
      boost::uuids::uuid uuid;
      uuid = uuidGenerator();
      preview.create_node(uuid, "C");
      kynedraw::VisibleNode& node = preview.create_visible_node(uuid, "C", pageX, pageY);
      preview.set_mouse_node(node);
      break;
    }
    case 22: {
      // oxygen
      preview.clear();
      boost::uuids::uuid uuid;
      uuid = uuidGenerator();
      preview.create_node(uuid, "O");
      kynedraw::VisibleNode& node = preview.create_visible_node(uuid, "O", pageX, pageY);
      preview.set_mouse_node(node);
      break;
    }
    case 23: {
      // nitrogen
      preview.clear();
      boost::uuids::uuid uuid;
      uuid = uuidGenerator();
      preview.create_node(uuid, "N");
      kynedraw::VisibleNode& node = preview.create_visible_node(uuid, "N", pageX, pageY);
      preview.set_mouse_node(node);
      break;
    }
    case 24: {
      // bromine
      preview.clear();
      boost::uuids::uuid uuid;
      uuid = uuidGenerator();
      preview.create_node(uuid, "Br");
      kynedraw::VisibleNode& node = preview.create_visible_node(uuid, "Br", pageX, pageY);
      preview.set_mouse_node(node);
      break;
    }
    case 25: {
      // chlorine
      preview.clear();
      boost::uuids::uuid uuid;
      uuid = uuidGenerator();
      preview.create_node(uuid, "Cl");
      kynedraw::VisibleNode& node = preview.create_visible_node(uuid, "Cl", pageX, pageY);
      preview.set_mouse_node(node);
      break;
    }
    case 26: {
      // sulfur
      preview.clear();
      boost::uuids::uuid uuid;
      uuid = uuidGenerator();
      preview.create_node(uuid, "S");
      kynedraw::VisibleNode& node = preview.create_visible_node(uuid, "S", pageX, pageY);
      preview.set_mouse_node(node);
      break;
    }
  }
}

std::string RetrieveAndTickSetting(std::string settingType, std::string defaultName)
{
  emscripten::val document = emscripten::val::global("document");
  emscripten::val localStorage = emscripten::val::global("localStorage");
  emscripten::val storedValue = localStorage.call<emscripten::val>("getItem", emscripten::val(settingType));
  std::string value;
  // checks if there is such a stored value: .as<bool>() will be false when the emscripten::val is null
  if (storedValue.as<bool>())
  {
    value = storedValue.as<std::string>();
  }
  else
  {
    value = defaultName;
  }
  // appends "-button" to the end of settingType, then gets the button with that id, then ticks it
  emscripten::val button = document.call<emscripten::val>("getElementById", emscripten::val(value + "-button"));
  if (!button.as<bool>())
  {
    button = document.call<emscripten::val>("getElementById", emscripten::val(defaultName + "-button"));
    value = defaultName;
  }
  button.call<void>("setAttribute", emscripten::val("checked"), emscripten::val("checked"));
  return value;
}

void InitializeAllSettings()
{
  kynedraw::settings::SELECTED_TOOL = RetrieveAndTickSetting("selectedTool", "single");
  std::string angleSnapSetting = RetrieveAndTickSetting("snapAngles", "snap");
  angleSnapSetting == "snap" ? kynedraw::settings::SNAP_ANGLES = true : kynedraw::settings::SNAP_ANGLES = false;
  std::string bondLengthSnapSetting = RetrieveAndTickSetting("snapBondLengths", "snap");
  bondLengthSnapSetting == "snap" ? kynedraw::settings::SNAP_BOND_LENGTHS = true : kynedraw::settings::SNAP_BOND_LENGTHS = false;

  // initialize the selectedTool to (0,0) because that is what static double previousPageX, previousPageY in UpdateNetworkPosition is initialized to
  ResetPreview(kynedraw::settings::SELECTED_TOOL, 0, 0);
}

void ClickButton(emscripten::val event)
{
  emscripten::val window = emscripten::val::global("window");
  kynedraw::settings::SELECTED_TOOL = event["target"]["id"].as<std::string>();
  ResetPreview(kynedraw::settings::SELECTED_TOOL, event["pageX"].as<double>(), event["pageY"].as<double>());
  window.call<void>("requestAnimationFrame", emscripten::val::module_property("RenderForeground"));
  event.call<void>("stopPropagation");
}

void UpdateNetworkPosition(double pageX, double pageY, bool mouseIsPressed, double mouseDownPageX, double mouseDownPageY)
{
  static double previousPageX, previousPageY, previousMouseBondAngle, previousMouseBondLength = 0.0;
  static kynedraw::VisibleNode* previousSnappedNode = nullptr;

  // NOTE: this assumes that previewMouseNode exists. If for some reason, preview is allowed to be empty, the next line will probably throw errors
  kynedraw::VisibleNode& previewMouseNode = preview.get_mouse_node();
  if (network.get_visible_nodes().size() != 0)
  {
    kynedraw::VisibleNode &closestVisibleNode = network.find_closest_visible_node_to(pageX, pageY);
    if (mouseIsPressed) {
      if (previousSnappedNode && preview.get_mouse_bond().has_value() && sqrt(pow(mouseDownPageX-pageX, 2) + pow(mouseDownPageY-pageY, 2)) >= kynedraw::settings::DEADZONE_RADIUS)
      {
        kynedraw::VisibleBond &previewMouseBond = *(preview.get_mouse_bond().value());
        auto linkedNodes = previewMouseBond.get_linked_nodes();
        auto nodePair = std::find_if(linkedNodes.begin(), linkedNodes.end(),
                                     [&previewMouseNode](auto &currentNodePair) {
                                       return currentNodePair.second == &previewMouseNode;
                                     });
        double currentRotation = previewMouseBond.get_bond_angle(nodePair->first);
        double newRotation;
        double currentLength = previewMouseBond.get_bond_length();
        double newLength;
        if (kynedraw::settings::SNAP_BOND_LENGTHS && kynedraw::settings::SNAP_ANGLES &&
            &closestVisibleNode != previousSnappedNode && sqrt(pow(closestVisibleNode.get_x() - pageX, 2) +
            pow(closestVisibleNode.get_y() - pageY, 2)) < kynedraw::settings::MOUSE_SNAP_RADIUS) {
          // there is a node within snapping distance of the mouse that is not the previousSnappedNode, so snap to that node
          newRotation = std::atan2(previousSnappedNode->get_y() - closestVisibleNode.get_y(),
                                   closestVisibleNode.get_x() - previousSnappedNode->get_x())
                                           * std::numbers::inv_pi * 180;
          newLength = sqrt(pow(closestVisibleNode.get_x() - previousSnappedNode->get_x(), 2) + pow(closestVisibleNode.get_y() - previousSnappedNode->get_y(), 2));
        } else {
          newRotation = std::atan2(previousSnappedNode->get_y() - pageY, pageX - previousSnappedNode->get_x()) *
                               std::numbers::inv_pi * 180;
          if (kynedraw::settings::SNAP_ANGLES) {
            newRotation = std::round(newRotation / 30) * 30;
          }
          newLength = kynedraw::settings::BOND_LENGTH;
        }
        double changeRotation = newRotation - currentRotation;
        if (changeRotation != 0.0)
        {
          previewMouseBond.rotate_branch_about(previewMouseNode, changeRotation);
        }

        std::cout << newLength << " " << currentLength << "\n";
        double changeLength = newLength - currentLength;
        if (changeLength != 0.0)
        {
          previewMouseBond.extend_branch_from(previewMouseNode, changeLength);
        }
        // TODO: add SNAP_BOND_LENGTHS functionality
      }
    } else {
      // a node to snap to exists
      if (sqrt(pow(closestVisibleNode.get_x() - pageX, 2) + pow(closestVisibleNode.get_y() - pageY, 2)) <
          kynedraw::settings::MOUSE_SNAP_RADIUS) {
        // the mouse node is withing snapping distance of a visible node
        if (previewMouseNode.get_uuid() != closestVisibleNode.get_uuid()) {
          // The preview mouse node does not have the same UUID as the closestVisibleNode, so snap the mouse node to the closestVisibleNode
          previewMouseNode.set_uuid(closestVisibleNode.get_uuid());
          preview.change_x_y(closestVisibleNode.get_x() - previewMouseNode.get_x(),
                             closestVisibleNode.get_y() - previewMouseNode.get_y());
          if (preview.get_mouse_bond().has_value()) {
            kynedraw::VisibleBond &previewMouseBond = *(preview.get_mouse_bond().value());
            auto linkedNodes = previewMouseBond.get_linked_nodes();
            auto nodePair = std::find_if(linkedNodes.begin(), linkedNodes.end(),
                                         [&previewMouseNode](auto &currentNodePair) {
                                           return currentNodePair.second == &previewMouseNode;
                                         });
            double currentRotation = previewMouseBond.get_bond_angle(nodePair->first);
            double newRotation = closestVisibleNode.get_predicted_next_bond_angle(
                    preview.get_mouse_bond().value()->get_num_bonds() - 1);
            double changeRotation = newRotation - currentRotation;
            if (changeRotation != 0.0)
            {
              previewMouseBond.rotate_branch_about(previewMouseNode, changeRotation);
            }
            previousMouseBondLength = previewMouseBond.get_bond_length();
            if (!previousSnappedNode) {
              // NOTE: this assumes that any ResetPreview does not change the angle of the mouse bond
              previousMouseBondAngle = currentRotation;
            }
          }
          previousSnappedNode = &closestVisibleNode;
        }
      } else {
        // the mouse node is not within snapping distance of any visible node
        if (previousSnappedNode) {
          previousSnappedNode = nullptr;
          // the mouse node still has the same uuid as the node it was snapped to in the previous frame, so change its position and its uuid
          // no need to check this if network size is 0 since there's no way to exit a node if there aren't any nodes in the first place
          previewMouseNode.set_uuid(uuidGenerator());
          preview.change_x_y(pageX - previewMouseNode.get_x(), pageY - previewMouseNode.get_y());
          if (preview.get_mouse_bond().has_value()) {
            kynedraw::VisibleBond &previewMouseBond = *(preview.get_mouse_bond().value());
            auto linkedNodes = previewMouseBond.get_linked_nodes();
            auto nodePair = std::find_if(linkedNodes.begin(), linkedNodes.end(),
                                         [&previewMouseNode](auto &currentNodePair) {
                                           return currentNodePair.second == &previewMouseNode;
                                         });

            double currentRotation = previewMouseBond.get_bond_angle(nodePair->first);
            double changeRotation = previousMouseBondAngle - currentRotation;
            if (changeRotation != 0.0)
            {
              previewMouseBond.rotate_branch_about(previewMouseNode, changeRotation);
            }
            previousMouseBondAngle = 0.0;


            double currentLength = previewMouseBond.get_bond_length();
            double changeLength = previousMouseBondLength - currentLength;
            if (changeLength != 0.0)
            {
              previewMouseBond.extend_branch_from(previewMouseNode, changeLength);
            }
            previousMouseBondLength = 0.0;
          }
        } else {
          preview.change_x_y(pageX - previousPageX, pageY - previousPageY);
        }
      }
    }
  } else {
    preview.change_x_y(pageX - previousPageX, pageY - previousPageY);
  }
  if (network.get_visible_bonds().size() != 0)
  {
    kynedraw::VisibleBond& closestVisibleBond = network.find_closest_visible_bond_to(pageX, pageY);
  }
  previousPageX = pageX;
  previousPageY = pageY;
}

void InteractWithCanvas(emscripten::val event)
{
  static double mouseDownPageX, mouseDownPageY = 0.0;
  static bool mouseIsPressed = false;
  static boost::uuids::uuid closestNodeUuid;

  emscripten::val window = emscripten::val::global("window");
  std::string eventName = event["type"].as<std::string>();
  /* NOTE: mousemove fires before mousedown and mouseup on an animation frame, at least in Chrome, so mouseup and
     mouse down get the pageX and pageY of the current frame. If mousemove fires after mousedown and mouseup, it should
     not be a problem for resetting the preview in mouseup since the mouse move event will correct the outdated
     position */
  static double pageX, pageY = 0.0;

  if (eventName == "mousemove") {
    pageX = event["pageX"].as<double>();
    pageY = event["pageY"].as<double>();
    UpdateNetworkPosition(pageX, pageY, mouseIsPressed, mouseDownPageX, mouseDownPageY);
  } else if (eventName == "mousedown") {
    mouseDownPageX = pageX;
    mouseDownPageY = pageY;
    mouseIsPressed = true;
  } else if (eventName == "mouseup") {
    // If mouseIsPressed is false and there is a mouseup event, that means that the mouse was clicked and dragged from a UI button to the canvas
    /* TODO: create an UpdateAndRenderBackground that determines if the action of merging network and preview will not
     * need to clear the screen and render everything again, which is an expensive operation, by seeing if the only
     * changes that occur are either that no node/bonds have been merged or only carbon atoms that don't have a label
     * have been merged */
    network.merge(preview);
    mouseIsPressed = false;
    ResetPreview(kynedraw::settings::SELECTED_TOOL, pageX, pageY);
    // move the resetted preview to the appropriate snapping location twice so that it correctly determines that the preview has been reset, then moves it to the correct location
    UpdateNetworkPosition(pageX, pageY, mouseIsPressed, mouseDownPageX, mouseDownPageY);
    UpdateNetworkPosition(pageX, pageY, mouseIsPressed, mouseDownPageX, mouseDownPageY);
    window.call<void>("requestAnimationFrame", emscripten::val::module_property("RenderBackground"));
  }
  window.call<void>("requestAnimationFrame", emscripten::val::module_property("RenderForeground"));
}

void InitializeCanvas(emscripten::val canvas, emscripten::val index, emscripten::val array)
{
  emscripten::val window = emscripten::val::global("window");
  canvas.set("width", window["innerWidth"]);
  canvas.set("height", window["innerHeight"]);
  emscripten::val ctx = canvas.call<emscripten::val>("getContext", emscripten::val("2d"));
  ctx.set("textAlign", emscripten::val("center"));
  ctx.set("textBaseline", emscripten::val("middle"));
  ctx.set("font", emscripten::val("20px Arial"));
  window.call<void>("requestAnimationFrame", emscripten::val::module_property("RenderBackground"));
  window.call<void>("requestAnimationFrame", emscripten::val::module_property("RenderForeground"));
}

void InitializeCanvases(emscripten::val event)
{
  emscripten::val document = emscripten::val::global("document");
  document.call<emscripten::val>("querySelectorAll", emscripten::val(".canvas")).call<void>("forEach", emscripten::val::module_property("InitializeCanvas"));
}

void RunMainLoop()
{
  // emscripten_set_main_loop(RenderForeground, 0, 1);
}
int main()
{
  emscripten::val window = emscripten::val::global("window");
  emscripten::val document = emscripten::val::global("document");
  window.call<void>("addEventListener", emscripten::val("resize"), emscripten::val::module_property("InitializeCanvases"));
  document.call<void>("addEventListener", emscripten::val("mousedown"), emscripten::val::module_property("InteractWithCanvas"));
  document.call<void>("addEventListener", emscripten::val("mouseup"), emscripten::val::module_property("InteractWithCanvas"));
  document.call<void>("addEventListener", emscripten::val("mousemove"), emscripten::val::module_property("InteractWithCanvas"));

  // add event listeners, which search for button elements or for labels that are at the same level in the DOM tree as the radio buttons with the specified name
  // NOTE: this will affect EVERY <button> element. Not a problem for now...
  document.call<emscripten::val>("querySelectorAll", emscripten::val("[name=tool-selection-button] + label")).call<void>("forEach", emscripten::val::module_property("AddToolButtonEventListener"));
  document.call<emscripten::val>("querySelectorAll", emscripten::val("[name=bond-snap-selection-button] + label")).call<void>("forEach", emscripten::val::module_property("AddBondSnapButtonEventListener"));
  document.call<emscripten::val>("querySelectorAll", emscripten::val("button, [name=tool-selection-button] + label, [name=bond-snap-selection-button] + label")).call<void>("forEach", emscripten::val::module_property("AddButtonEventListeners"));

  // initialize width and height of the canvas
  document.call<emscripten::val>("querySelectorAll", emscripten::val(".canvas")).call<void>("forEach", emscripten::val::module_property("InitializeCanvas"));

  // retrieve all settings from localStorage and set the appropriate boxes to "checked" and put the appropriate data into preview
  InitializeAllSettings();

  // RunMainLoop();
  return 0;
}

EMSCRIPTEN_BINDINGS(bindings)\
{\
  emscripten::function("InteractWithCanvas", InteractWithCanvas);\
  emscripten::function("InitializeCanvases", InitializeCanvases);\
  emscripten::function("InitializeCanvas", InitializeCanvas);\
  emscripten::function("RenderBackground", RenderBackground);\
  emscripten::function("RenderForeground", RenderForeground);\
  emscripten::function("ClickButton", ClickButton);\
  emscripten::function("AddButtonEventListeners", AddButtonEventListeners);\
  emscripten::function("AddToolButtonEventListener", AddToolButtonEventListener);\
  emscripten::function("StoreSelectedTool", StoreSelectedTool);\
  emscripten::function("AddBondSnapButtonEventListener", AddBondSnapButtonEventListener);\
  emscripten::function("StoreAngleSnapSetting", StoreAngleSnapSetting);\
  emscripten::function("StoreBondLengthSnapSetting", StoreBondLengthSnapSetting);\
};