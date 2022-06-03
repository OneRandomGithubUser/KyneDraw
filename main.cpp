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
// #include <fstream>
// #include <boost/json.hpp>                    // parse JSON

// debug imports
#include <iostream>
#include <boost/uuid/uuid_io.hpp>         // uuid streaming operators

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
    double AUTO_SNAP_RADIUS = 5;
    bool SHOW_CARBONS = false;
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
std::string selectedTool;
std::string bondSnapSetting;

kynedraw::Graph network;
kynedraw::Preview preview;

void RenderBackground(double DOMHighResTimeStamp)
{
  emscripten::val document = emscripten::val::global("document");
  emscripten::val canvas = document.call<emscripten::val>("getElementById", emscripten::val("canvas-background"));
  emscripten::val ctx = canvas.call<emscripten::val>("getContext", emscripten::val("2d"));
  ctx.call<void>("clearRect", 0, 0, canvas["width"], canvas["height"]);
  for (const auto& [uuid, currentVisibleNode] : network.get_visible_nodes())
  {
    ctx.call<void>("beginPath");
    ctx.call<void>("arc", currentVisibleNode.get_x(), currentVisibleNode.get_y(), kynedraw::settings::MOUSE_SNAP_RADIUS, 0, 2 * pi);
    ctx.call<void>("stroke");
  }
  ctx.call<void>("beginPath");
  for (const auto& [uuid, currentVisibleBond] : network.get_visible_bonds())
  {
    kynedraw::VisibleNode& firstNode = currentVisibleBond.get_first_node();
    kynedraw::VisibleNode& secondNode = currentVisibleBond.get_second_node();
    ctx.call<void>("moveTo", firstNode.get_x(), firstNode.get_y());
    ctx.call<void>("lineTo", secondNode.get_x(), secondNode.get_y());
  }
  ctx.call<void>("stroke");
}

void RenderForeground(double DOMHighResTimeStamp)
{
  emscripten::val document = emscripten::val::global("document");
  emscripten::val canvas = document.call<emscripten::val>("getElementById", emscripten::val("canvas-foreground"));
  emscripten::val ctx = canvas.call<emscripten::val>("getContext", emscripten::val("2d"));

  ctx.call<void>("clearRect", 0, 0, canvas["width"], canvas["height"]);
  for (const auto& [uuid, currentVisibleNode] : preview.get_visible_nodes())
  {
    ctx.call<void>("beginPath");
    ctx.call<void>("arc", currentVisibleNode.get_x(), currentVisibleNode.get_y(), kynedraw::settings::AUTO_SNAP_RADIUS, 0, 2 * pi);
    ctx.call<void>("stroke");
  }
  ctx.call<void>("beginPath");
  for (const auto& [uuid, currentVisiblePreviewBond] : preview.get_visible_bonds())
  {
    kynedraw::VisibleNode& firstNode = currentVisiblePreviewBond.get_first_node();
    kynedraw::VisibleNode& secondNode = currentVisiblePreviewBond.get_second_node();
    ctx.call<void>("moveTo", firstNode.get_x(), firstNode.get_y());
    ctx.call<void>("lineTo", secondNode.get_x(), secondNode.get_y());
  }
  ctx.call<void>("stroke");

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
  element.call<void>("addEventListener", emscripten::val("mouseup"), emscripten::val::module_property("StoreBondSnapSetting"));
}

void StoreBondSnapSetting(emscripten::val event)
{
  emscripten::val localStorage = emscripten::val::global("localStorage");
  localStorage.call<void>("setItem", emscripten::val("bondSnapSetting"), event["target"]["id"]);
}

void ResetPreview(std::string tool, double pageX, double pageY)
{
  int toolID = buttonIDs.at(tool);
  preview.clear();
  switch (buttonIDs.at(tool)) {
    case 10: {
      // single
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
      preview.create_bond_between(uuid, 1, node1, node2);
      preview.create_visible_bond_between(uuid, 1, visibleNode1, visibleNode2);
      break;
    }
    case 21: {
      // carbon
      boost::uuids::uuid uuid;
      uuid = uuidGenerator();
      preview.create_node(uuid, "C");
      preview.create_visible_node(uuid, "C", pageX, pageY);
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
  // checks if there is such a stored value: typeOf will be "object" when the emscripten::val is null
  if (storedValue.typeOf().as<std::string>() == "string")
  {
    value = storedValue.as<std::string>();
  }
  else
  {
    value = defaultName;
  }
  // appends "-button" to the end of settingType, then gets the button with that id, then ticks it
  document.call<emscripten::val>("getElementById", emscripten::val(value + "-button")).call<void>("setAttribute", emscripten::val("checked"), emscripten::val("checked"));
  return value;
}

void InitializeAllSettings()
{
  selectedTool = RetrieveAndTickSetting("selectedTool", "single");
  bondSnapSetting = RetrieveAndTickSetting("bondSnapSetting", "freeform");

  // initialize the selectedTool to (0,0) because that is what static double previousPageX, previousPageY in MouseMove is initialized to
  ResetPreview(selectedTool, 0, 0);
}

void ClickButton(emscripten::val event)
{
  emscripten::val window = emscripten::val::global("window");
  selectedTool = event["target"]["id"].as<std::string>();
  ResetPreview(selectedTool, event["pageX"].as<double>(), event["pageY"].as<double>());
  window.call<void>("requestAnimationFrame", emscripten::val::module_property("RenderForeground"));
  event.call<void>("stopPropagation");
}

void MouseMove(double pageX, double pageY, bool mouseIsPressed, double mouseDownPageX, double mouseDownPageY)
{
  static double previousPageX, previousPageY = 0.0;
  static bool snappedToNode = false;

  if (mouseIsPressed)
  {
    if (sqrt(pow(mouseDownPageX-pageX, 2) + pow(mouseDownPageY-pageY, 2)) < kynedraw::settings::DEADZONE_RADIUS)
    {
      // TODO: rotate the preview when the mouse is dragged outside of the deadzone
    }
  } else if (!snappedToNode) {
    preview.change_x_y(pageX - previousPageX, pageY - previousPageY);
  }

  // NOTE: this assumes that previewMouseNode exists. If for some reason, preview is allowed to be empty, the next line will probably throw errors
  kynedraw::VisibleNode& previewMouseNode = preview.get_mouse_node();
  if (network.get_visible_nodes().size() != 0)
  {
    // a node to snap to exists
    kynedraw::VisibleNode& closestVisibleNode = network.find_closest_visible_node_to(pageX, pageY);
    if (sqrt(pow(closestVisibleNode.get_x()-pageX,2) + pow(closestVisibleNode.get_y()-pageY,2)) < kynedraw::settings::MOUSE_SNAP_RADIUS)
    {
      // the mouse node is withing snapping distance of a visible node
      if (previewMouseNode.get_uuid() != closestVisibleNode.get_uuid()) {
        // The preview mouse node does not have the same UUID as the closestVisibleNode, so snap the mouse node to the closestVisibleNode
        snappedToNode = true;
        previewMouseNode.set_uuid(closestVisibleNode.get_uuid());
        preview.change_x_y(closestVisibleNode.get_x() - previewMouseNode.get_x(),
                           closestVisibleNode.get_y() - previewMouseNode.get_y());
      }
    } else {
      // the mouse node is not within snapping distance of any visible node
      if (snappedToNode)
      {
        snappedToNode = false;
        // the mouse node still has the same uuid as the node it was snapped to in the previous frame, so change its position and its uuid
        // no need to check this if network size is 0 since there's no way to exit a node if there aren't any nodes in the first place
        previewMouseNode.set_uuid(uuidGenerator());
        preview.change_x_y(pageX-previewMouseNode.get_x(), pageY-previewMouseNode.get_y());
      }
    }
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
  double pageX = event["pageX"].as<double>();
  double pageY = event["pageY"].as<double>();

  // NOTE: mousemove fires before mousedown and mouseup on an animation frame, at least in Chrome
  if (eventName == "mousemove") {
    MouseMove(pageX, pageY, mouseIsPressed, mouseDownPageX, mouseDownPageY);
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
    ResetPreview(selectedTool, pageX, pageY);
    window.call<void>("requestAnimationFrame", emscripten::val::module_property("RenderBackground"));
  }
  window.call<void>("requestAnimationFrame", emscripten::val::module_property("RenderForeground"));
  // TODO: use the closest visible nodes and bonds to customize the preview
}

void ResizeCanvas(emscripten::val canvas, emscripten::val index, emscripten::val array)
{
  emscripten::val window = emscripten::val::global("window");
  canvas.set("width", window["innerWidth"]);
  canvas.set("height", window["innerHeight"]);
}

void ResizeCanvases(emscripten::val event)
{
  emscripten::val document = emscripten::val::global("document");
  document.call<emscripten::val>("querySelectorAll", emscripten::val(".canvas")).call<void>("forEach", emscripten::val::module_property("ResizeCanvas"));
}

void RunMainLoop()
{
  // emscripten_set_main_loop(RenderForeground, 0, 1);
}

int main()
{
  emscripten::val window = emscripten::val::global("window");
  emscripten::val document = emscripten::val::global("document");
  window.call<void>("addEventListener", emscripten::val("resize"), emscripten::val::module_property("ResizeCanvases"));
  document.call<void>("addEventListener", emscripten::val("mousedown"), emscripten::val::module_property("InteractWithCanvas"));
  document.call<void>("addEventListener", emscripten::val("mouseup"), emscripten::val::module_property("InteractWithCanvas"));
  document.call<void>("addEventListener", emscripten::val("mousemove"), emscripten::val::module_property("InteractWithCanvas"));

  // add event listeners, which search for button elements or for labels that are at the same level in the DOM tree as the radio buttons with the specified name
  // NOTE: this will affect EVERY <button> element. Not a problem for now...
  document.call<emscripten::val>("querySelectorAll", emscripten::val("[name=tool-selection-button] + label")).call<void>("forEach", emscripten::val::module_property("AddToolButtonEventListener"));
  document.call<emscripten::val>("querySelectorAll", emscripten::val("[name=bond-snap-selection-button] + label")).call<void>("forEach", emscripten::val::module_property("AddBondSnapButtonEventListener"));
  document.call<emscripten::val>("querySelectorAll", emscripten::val("button, [name=tool-selection-button] + label, [name=bond-snap-selection-button] + label")).call<void>("forEach", emscripten::val::module_property("AddButtonEventListeners"));

  // initialize width and height of the canvas
  document.call<emscripten::val>("querySelectorAll", emscripten::val(".canvas")).call<void>("forEach", emscripten::val::module_property("ResizeCanvas"));

  // retrieve all settings from localStorage and set the appropriate boxes to "checked" and put the appropriate data into preview
  InitializeAllSettings();

  // RunMainLoop();
  return 0;
}

EMSCRIPTEN_BINDINGS(bindings)\
{\
  emscripten::function("InteractWithCanvas", InteractWithCanvas);\
  emscripten::function("ResizeCanvases", ResizeCanvases);\
  emscripten::function("ResizeCanvas", ResizeCanvas);\
  emscripten::function("RenderBackground", RenderBackground);\
  emscripten::function("RenderForeground", RenderForeground);\
  emscripten::function("ClickButton", ClickButton);\
  emscripten::function("AddButtonEventListeners", AddButtonEventListeners);\
  emscripten::function("AddToolButtonEventListener", AddToolButtonEventListener);\
  emscripten::function("StoreSelectedTool", StoreSelectedTool);\
  emscripten::function("AddBondSnapButtonEventListener", AddBondSnapButtonEventListener);\
  emscripten::function("StoreBondSnapSetting", StoreBondSnapSetting);\
};