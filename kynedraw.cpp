#include <cmath>
#include <unordered_map>
#include <numbers>
#include <algorithm>
#include <optional>
#include <boost/uuid/uuid.hpp>
#include <boost/functional/hash.hpp>
//#include <boost/geometry.hpp>
#include <boost/geometry/geometries/point.hpp>
#include <boost/geometry/geometries/segment.hpp>
#include <boost/geometry/index/rtree.hpp>

// debug headers
#include <boost/uuid/uuid_io.hpp>
#include <iostream>

// once CMake adds full support for importing C++20 headers, the below #include can be deleted
#include "kynedraw.h"
// import kynedraw;

void kynedraw::settings::set_projection(std::string setProjection)
{
  projection = setProjection;
}

// RTree boilerplate taken from https://stackoverflow.com/a/25083918

// Convenient namespaces
namespace bg = boost::geometry;
namespace bgm = boost::geometry::model;
namespace bgi = boost::geometry::index;

// Convenient types
typedef bgm::point<double, 2, bg::cs::cartesian> point;
typedef bgm::segment<point> segment;
// The boost::uuids::uuid stores the uuids of the segment (VisibleBond) or of the point (VisibleNode)
typedef bgi::rtree<std::pair<point, boost::uuids::uuid>, bgi::rstar<16>> point_rtree;
typedef bgi::rtree<std::pair<segment, boost::uuids::uuid>, bgi::rstar<16>> segment_rtree;

/***********************************************************************************************************************
 * Node
***********************************************************************************************************************/

void kynedraw::GenericNode::set_uuid(boost::uuids::uuid uuid) {
  this->uuid = uuid;
}
void kynedraw::GenericNode::refresh_internal_vars()
{
  if (numH < 0) {
    // if there aren't enough hydrogens to change into regular bonds, change the charge and number of unbonded electrons to cover the difference and maintain the octet
    charge -= numH;
    numLoneE += 2 * numH;
    numH = 0;
    if (numLoneE < 0) {
      // if doing this uses too many unbonded electrons, violate the octet
      charge += numLoneE;
      numLoneE = 0;
    }
  } else if (numH > 0 && charge > 0) {
    // if there is a positive charge and hydrogens that can be sacrificed, break the bond to the hydrogen
    if (numH > charge) {
      numH -= charge;
      charge = 0;
    } else {
      charge -= numH;
      numH = 0;
    }
  }
}
kynedraw::GenericNode::GenericNode(boost::uuids::uuid uuid, std::string name, kynedraw::Graph& linkedGraph) {
  this->uuid = uuid;
  this->name = name;
  this->linkedGraph = &linkedGraph;
  numBonds = 0;
  charge = 0;
  numH = get_valency();
  numLoneE = get_full_valence_electrons() - get_valency();
}
int kynedraw::GenericNode::get_full_valence_electrons() const {
  const static std::unordered_map<std::string, int> valenceShellMap = {
          {"H", 2},
          {"He", 2}
  };
  if (valenceShellMap.contains(name))
  {
    return valenceShellMap.at(name) - get_valency();
  } else {
    return 8 - get_valency();
  }
}
int kynedraw::GenericNode::get_valency() const {
  const static std::unordered_map<std::string, int> valenceMap = {
      {"H", 1},
      {"C", 4},
      {"O", 2},
      {"N", 3},
      {"Br", 1},
      {"Cl", 1},
      {"S", 2}
  };
  return valenceMap.at(name);
}
boost::uuids::uuid kynedraw::GenericNode::get_uuid() const {
  return uuid;
}
std::string kynedraw::GenericNode::get_name() const {
  return name;
}
int kynedraw::GenericNode::get_num_bonds() const {
  return numBonds;
}
int kynedraw::GenericNode::get_charge() const {
  return charge;
}
int kynedraw::GenericNode::get_num_h() const {
  return numH;
}
int kynedraw::GenericNode::get_num_lone_e() const {
  return numLoneE;
}
void kynedraw::GenericNode::smart_set_name(std::string newName) {
  int oldValence = get_valency();
  name = newName;
  int changeValence = oldValence - get_valency();
  numH -= changeValence;
  refresh_internal_vars();
}
void kynedraw::GenericNode::smart_change_num_bonds(int changeNumBonds) {
  numBonds += changeNumBonds;
  numH -= changeNumBonds;
  refresh_internal_vars();
}
bool kynedraw::GenericNode::operator==(const kynedraw::GenericNode &rhs) const noexcept {
  return uuid == rhs.uuid;
}
bool kynedraw::GenericNode::operator!=(const kynedraw::GenericNode &rhs) const noexcept {
  return uuid != rhs.uuid;
}
void kynedraw::GenericNode::merge
(kynedraw::GenericNode& sacrificialNode) {
  // check that the nodes that are trying to be merged together can even be merged together
  if (uuid != sacrificialNode.get_uuid())
  {
    throw std::invalid_argument("tried to merge nodes with different uuids");
  }
  if (name != sacrificialNode.get_name() && sacrificialNode.get_name() != "C")
  {
    smart_set_name(sacrificialNode.get_name());
  }
  smart_change_num_bonds(sacrificialNode.get_num_bonds());
}
kynedraw::Node::Node(boost::uuids::uuid uuid, std::string name, kynedraw::Graph& linkedGraph) : GenericNode(uuid, name, linkedGraph)
{
  //
}
void kynedraw::Node::set_uuid(boost::uuids::uuid newUuid) {
  linkedGraph->set_node_uuid(*this, newUuid);
  kynedraw::GenericNode::set_uuid(newUuid);
}
const std::vector<std::pair<int, kynedraw::Bond*>>& kynedraw::Node::get_linked_bonds() {
  return linkedBonds;
}
std::vector<kynedraw::VisibleNode*> kynedraw::VisibleNode::get_branch_including(int nodeIndexInBond, kynedraw::VisibleBond& bond)
{
  auto bondLinkedNodes = bond.get_linked_nodes();
  if (bondLinkedNodes.at(nodeIndexInBond).second != this)
  {
    throw std::invalid_argument("node not in bond at specified position");
  } else {
    auto otherNodePointer = bondLinkedNodes.at((nodeIndexInBond + 1) % 2).second;
    std::vector<kynedraw::VisibleNode*> ans;
    bool loopDetected = false;
    kynedraw::VisibleNode* loopDetectNode = this;
    otherNodePointer->get_branch_helper(ans, loopDetected, loopDetectNode, otherNodePointer);
    return ans;
  }
}
// TODO: change get_nodes() of bond to only return nodes
void kynedraw::VisibleNode::get_branch_helper(std::vector<kynedraw::VisibleNode*>& ans, bool& loopDetected, kynedraw::VisibleNode*& loopDetectNode, kynedraw::VisibleNode*& loopIgnoreNode)
{
  if (loopDetected)
  {
    return;
  } else {
    ans.emplace_back(this);
  }
  for (auto& [nodeIndexInBond, bondPointer] : linkedBonds)
  {
    auto otherNodePointer = bondPointer->get_linked_nodes().at((nodeIndexInBond + 1) % 2).second;
    if (otherNodePointer == loopDetectNode)
    {
      // a loop has been found
      if (this != loopIgnoreNode)
      {
        ans.clear();
        loopDetected = true;
        return;
      } else {
        continue;
      }
    }
    if (std::find_if(ans.begin(), ans.end(),
                     [&otherNodePointer](auto& currentNodePointer) {return currentNodePointer == otherNodePointer;})
                     == ans.end())
    {
      otherNodePointer->get_branch_helper(ans, loopDetected, loopDetectNode, loopIgnoreNode);
    }
  }
}
const std::vector<kynedraw::VisibleNode *>& kynedraw::Node::get_linked_nodes() {
  return linkedNodes;
}
int kynedraw::Node::add_bond_info(int bondIndexInNode, kynedraw::Bond& bond) {
  linkedBonds.emplace_back(bondIndexInNode, &bond);
  smart_change_num_bonds(bond.get_num_bonds());
  return linkedBonds.size() - 1;
}
void kynedraw::Node::remove_bond_info(int nodeIndexInBond, kynedraw::Bond& bond) {
  linkedBonds.erase(linkedBonds.begin() + nodeIndexInBond);
  smart_change_num_bonds(-bond.get_num_bonds());
}
void kynedraw::Node::merge(kynedraw::Node& sacrificialNode)
{
  this->kynedraw::GenericNode::merge(sacrificialNode);
  for (auto& [nodeIndexInBond, bondPointer] : sacrificialNode.linkedBonds)
  {
    linkedBonds.emplace_back(nodeIndexInBond, bondPointer);
    bondPointer->set_linked_node(nodeIndexInBond, linkedBonds.size() - 1, *this);
  }
  sacrificialNode.linkedBonds.clear();
}
void kynedraw::Node::remove()
{
  for (auto& currentPair : linkedBonds)
  {
    currentPair.second->remove();
  }
  linkedGraph->remove_node(*this);
}
kynedraw::VisibleNode::VisibleNode(boost::uuids::uuid uuid,
                                   std::string name,
                                   double x,
                                   double y,
                                   kynedraw::point_rtree &rtree,
                                   kynedraw::Graph& linkedGraph) : GenericNode(uuid, name, linkedGraph)
{
  this->x = x;
  this->y = y;
  this->rtree = &rtree;
}
void kynedraw::VisibleNode::set_uuid(boost::uuids::uuid newUuid) {
  rtree->remove(std::make_pair(point(x, y), uuid));
  rtree->insert(std::make_pair(point(x, y), newUuid));
  linkedGraph->set_visible_node_uuid(*this, newUuid);
  kynedraw::GenericNode::set_uuid(newUuid);
}
const std::vector<std::pair<int, kynedraw::VisibleBond*>>& kynedraw::VisibleNode::get_linked_bonds() {
  return linkedBonds;
}
const std::vector<kynedraw::Node*> &kynedraw::VisibleNode::get_linked_nodes() {
  return linkedNodes;
}
void kynedraw::VisibleNode::set_rtree_coordinates(double initialX, double initialY, double finalX, double finalY) {
  // though I wish you could call this as an updating function without any parameters, boost's rtree does not let me remove a point unless I know where it is
  // why I can't remove it if I just know its Indexable ID, I do not know
  rtree->remove(std::make_pair(point(initialX, initialY), uuid));
  rtree->insert(std::make_pair(point(finalX, finalY), uuid));
  for (auto& currentPair : linkedBonds)
  {
    currentPair.second->set_rtree_coordinates(*this, initialX, initialY, finalX, finalY);
  }
}
double kynedraw::VisibleNode::get_x() const {
  return x;
}
void kynedraw::VisibleNode::change_x(double change_x, bool updateBondAngle) {
  set_rtree_coordinates(x, y, x + change_x, y);
  x += change_x;
  if (updateBondAngle)
  {
    for (auto &currentPair: linkedBonds)
    {
      currentPair.second->refresh_bond_angle();
    }
  }
}
void kynedraw::VisibleNode::set_x(double x) {
  this->set_rtree_coordinates(this->x, y, x, y);
  this->x = x;
  for (auto& currentPair : linkedBonds)
  {
    currentPair.second->refresh_bond_angle();
  }
}
double kynedraw::VisibleNode::get_y() const {
  return y;
}
void kynedraw::VisibleNode::change_y(double change_y, bool updateBondAngle) {
  this->set_rtree_coordinates(x, y, x, y + change_y);
  this->y += change_y;
  if (updateBondAngle)
  {
    for (auto &currentPair: linkedBonds)
    {
      currentPair.second->refresh_bond_angle();
    }
  }
}
void kynedraw::VisibleNode::set_y(double y) {
  this->set_rtree_coordinates(x, this->y, x, y);
  this->y = y;
  for (auto& currentPair : linkedBonds)
  {
    currentPair.second->refresh_bond_angle();
  }
}
void kynedraw::VisibleNode::change_x_y(double change_x, double change_y, bool updateBondAngle) {
  this->set_rtree_coordinates(x, y, x + change_x, y + change_y);
  x += change_x;
  y += change_y;
  if (updateBondAngle)
  {
    for (auto &currentPair: linkedBonds)
    {
      currentPair.second->refresh_bond_angle();
    }
  }
}
void kynedraw::VisibleNode::set_x_y(double x, double y) {
  this->set_rtree_coordinates(this->x, this->y, x, y);
  this->x = x;
  this->y = y;
  for (auto& currentPair : linkedBonds)
  {
    currentPair.second->refresh_bond_angle();
  }
}
void kynedraw::VisibleNode::refresh_predicted_next_bond_angle_list() {
  static std::vector<std::vector<int>> defaultSectorOrdering = {
          {11, 7, 3, 8},
          {10, 2, 6, 3},
          {9, 1, 5, 2},
          {8, 3, 11, 7},
          {7, 11, 3, 8},
          {6, 10, 2, 11},
          {5, 1, 9, 2},
          {4, 8, 0, 9},
          {3, 7, 11, 8},
          {2, 9, 5, 1},
          {1, 5, 9, 2},
          {0, 8, 4, 7}
  };
  std::vector<double> bondAngles;
  double averageBondAngleFromSector = 0.0;
  std::vector<int> bondSectors;
  for (auto& [index, bondPointer] : linkedBonds)
  {
    double bondAngle = bondPointer->get_bond_angle(index);
    bondAngles.emplace_back(bondAngle);
    int closestSector = ((int) std::round(bondAngle/30)) % 12;
    bondSectors.emplace_back(closestSector);
    averageBondAngleFromSector += (bondAngle - closestSector*30);
  }
  averageBondAngleFromSector /= (bondSectors.size());
  if (kynedraw::settings::projection == "sawhorse")
  {
    if (bondSectors.size() == 0)
    {
      predictedNextBondAngleList = {30, 30, 30};
      return;
    }
    bool found = false;
    if (bondSectors.size() >= 1 && bondSectors.size() <= 3)
    {
      auto predefinedSectorOrdering = std::find_if(defaultSectorOrdering.begin(), defaultSectorOrdering.end(),
                                         [&bondSectors](auto &currentSectorOrdering)
                                         {
                                           bool found = true;
                                           for (int i = 0; i < bondSectors.size(); ++i)
                                           {
                                             if (currentSectorOrdering.at(i) != bondSectors.at(i))
                                             {
                                               found = false;
                                               break;
                                             }
                                           }
                                           return found;
                                         });
      if (predefinedSectorOrdering != defaultSectorOrdering.end())
      {
        // the bondSectors are in a pattern that defaultSectorOrdering defines the next addition to
        double predictedNextAngle = predefinedSectorOrdering->at(bondSectors.size()) * 30 + averageBondAngleFromSector;
        predictedNextBondAngleList = {predictedNextAngle, predictedNextAngle, predictedNextAngle};
        found = true;
      }
    }
    if (!found)
    {
      std::sort(bondAngles.begin(), bondAngles.end());
      double biggestGap = 360 - bondAngles.back() + bondAngles.front();
      std::pair<int, int> biggestGapIndex = std::make_pair(0, bondAngles.size() - 1);
      bool found = false;
      for (int i = 0; i < bondAngles.size() - 1; ++i)
      {
        double gap = bondAngles.at(i+1) - bondAngles.at(i);
        if (gap > biggestGap)
        {
          biggestGap = gap;
          biggestGapIndex = std::make_pair(i, i+1);
          found = true;
        }
      }
      double predictedNextAngle;
      if (found)
      {
        predictedNextAngle = bondAngles.at(biggestGapIndex.first) + biggestGap/2;
      } else {
        predictedNextAngle = bondAngles.at(biggestGapIndex.second) + biggestGap/2;
      }
      predictedNextBondAngleList = {predictedNextAngle, predictedNextAngle, predictedNextAngle};
      // TODO: use biggestGapIndex to determine render ordering and determine what to do when some angles are the same
    }
    if (bondSectors.size() == 1)
    {
      // linear alkynes
      predictedNextBondAngleList.at(2) = std::fmod(bondAngles.at(0) + 180, 360);
      if (numBonds == 2)
      {
        // linear allenes
        predictedNextBondAngleList.at(1) = std::fmod(bondAngles.at(0) + 180, 360);
      }
    }
  }
}
double kynedraw::VisibleNode::get_predicted_next_bond_angle(int newNumBonds)
{
  if (newNumBonds < 0)
  {
    throw std::invalid_argument("cannot get the predicted next bond angle for a negative number of new bonds");
  }
  return predictedNextBondAngleList.at(newNumBonds);
}
int kynedraw::VisibleNode::add_bond_info(int bondIndexInNode, kynedraw::VisibleBond& bond) {
  linkedBonds.emplace_back(bondIndexInNode, &bond);
  smart_change_num_bonds(bond.get_num_bonds());
  return linkedBonds.size() - 1;
}
void kynedraw::VisibleNode::remove_bond_info(int nodeIndexInBond, kynedraw::VisibleBond& bond) {
  linkedBonds.erase(linkedBonds.begin() + nodeIndexInBond);
  smart_change_num_bonds(-bond.get_num_bonds());
}
void kynedraw::VisibleNode::merge(kynedraw::VisibleNode& sacrificialNode)
{
  // NOTE: this tolerance of 0.1% is to account for floating point errors and can be adjusted as necessary
  // it shouldn't be important since they should have exactly the same coordinates anyways
  // this is why it uses a quick axial box rather than a slower circle to check their coordinates as the exact shape doesn't matter
  if (abs(x-sacrificialNode.get_x())/(x) > 0.001 || abs(y-sacrificialNode.get_y())/(y) > 0.001)
  {
    throw std::invalid_argument("tried to merge visibleNodes with different positions");
  }
  this->kynedraw::GenericNode::merge(sacrificialNode);
  for (auto& [nodeIndexInBond, bondPointer] : sacrificialNode.linkedBonds)
  {
    linkedBonds.emplace_back(nodeIndexInBond, bondPointer);
    bondPointer->set_linked_node(nodeIndexInBond, linkedBonds.size() - 1, *this);
  }
  sacrificialNode.linkedBonds.clear();
  // NOTE: this next for loop is technically not necessary because they should be in the same location anyways
  for (auto& currentPair : linkedBonds)
  {
    currentPair.second->refresh_bond_angle();
  }
  refresh_predicted_next_bond_angle_list();
}
void kynedraw::VisibleNode::remove()
{
  for (auto& currentPair : linkedBonds)
  {
    currentPair.second->remove();
  }
  rtree->remove(std::make_pair(point(x, y), uuid));
  linkedGraph->remove_visible_node(*this);
}

/***********************************************************************************************************************
 * Bond
***********************************************************************************************************************/

kynedraw::GenericBond::GenericBond(boost::uuids::uuid uuid, int numBonds, kynedraw::Graph& linkedGraph) {
  this->uuid = uuid;
  this->numBonds = numBonds;
  this->linkedGraph = &linkedGraph;
}
boost::uuids::uuid kynedraw::GenericBond::get_uuid() const {
  return uuid;
}
int kynedraw::GenericBond::get_num_bonds() const {
  return numBonds;
}
kynedraw::Bond::Bond(boost::uuids::uuid uuid,
                                   int numBonds,
                                   kynedraw::Graph& linkedGraph) : GenericBond(uuid, numBonds, linkedGraph)
{
  //
}
const std::array<std::pair<int, kynedraw::Node*>, 2>& kynedraw::Bond::get_linked_nodes() {
  // NOTE: linkedNodes should ALWAYS only have two elements
  return linkedNodes;
}
void kynedraw::Bond::set_linked_node(int nodeIndexInBond, int bondIndexInNode, kynedraw::Node& newNode)
{
  if (nodeIndexInBond != 0 && nodeIndexInBond != 1)
  {
    throw std::invalid_argument("nodeIndexInBond out of bounds");
  }
  linkedNodes.at(nodeIndexInBond) = std::make_pair(bondIndexInNode, &newNode);
}
kynedraw::Node& kynedraw::Bond::get_node(int index) const
{
  if (index == 0 || index == 1)
  {
    return *(linkedNodes.at(index).second);
  } else {
    throw std::invalid_argument("index of get_node of bond out of bounds");
  }
}
kynedraw::Node& kynedraw::Bond::get_node(int index)
{
  if (index == 0 || index == 1)
  {
    return *(linkedNodes.at(index).second);
  } else {
    throw std::invalid_argument("index of get_node of bond out of bounds");
  }
}
void kynedraw::Bond::remove() {
  for (auto& [bondIndexInNode, nodePointer] : linkedNodes)
  {
    nodePointer->remove_bond_info(bondIndexInNode, *this);
  }
  linkedGraph->remove_bond(*this);
}
kynedraw::VisibleBond::VisibleBond(boost::uuids::uuid uuid,
                                   int numBonds,
                                   segment_rtree &rtree,
                                   kynedraw::Graph& linkedGraph) : GenericBond(uuid, numBonds, linkedGraph)
{
  offsetXY.resize(numBonds, std::make_pair(0.0, 0.0));
  this->rtree = &rtree;
  refresh_bond_angle();
}
double kynedraw::VisibleBond::get_bond_angle(int index) const
{
  if (index == 0)
  {
    return bondAngle;
  } else if (index == 1) {
    if (bondAngle < 180)
    {
      return bondAngle + 180;
    } else {
      return bondAngle - 180;
    }
  } else {
    throw std::invalid_argument("index out of bounds");
  }
}
void kynedraw::VisibleBond::refresh_bond_angle()
{
  bondAngle = atan2(get_node(0).get_y() - get_node(1).get_y(), get_node(1).get_x() - get_node(0).get_x()) * std::numbers::inv_pi*180;
  if (bondAngle < 0)
  {
    // bond angle will be in the range [-180, 180] so this will change the range to [0, 360)
    bondAngle += 360;
  }
}
const std::array<std::pair<int, kynedraw::VisibleNode*>, 2>& kynedraw::VisibleBond::get_linked_nodes() {
  // NOTE: linkedNodes should ALWAYS only have two elements
  return linkedNodes;
}
void kynedraw::VisibleBond::set_linked_node(int nodeIndexInBond, int bondIndexInNode, kynedraw::VisibleNode& newNode)
{
  if (nodeIndexInBond != 0 && nodeIndexInBond != 1)
  {
    throw std::invalid_argument("nodeIndexInBond out of bounds");
  }
  linkedNodes.at(nodeIndexInBond) = std::make_pair(bondIndexInNode, &newNode);
  refresh_bond_angle();
}
kynedraw::VisibleNode& kynedraw::VisibleBond::get_node(int index) const
{
  if (index == 0 || index == 1)
  {
    return *(linkedNodes.at(index).second);
  } else {
    throw std::invalid_argument("index of get_node of bond out of bounds");
  }
}
kynedraw::VisibleNode& kynedraw::VisibleBond::get_node(int index)
{
  if (index == 0 || index == 1)
  {
    return *(linkedNodes.at(index).second);
  } else {
    throw std::invalid_argument("index of get_node of bond out of bounds");
  }
}
void kynedraw::VisibleBond::rotate_branch_about(kynedraw::VisibleNode& node, double degrees)
{
  auto nodePair = std::find_if(linkedNodes.begin(), linkedNodes.end(),
                              [&node](auto& currentNodePair) {return currentNodePair.second == &node;});
  if (nodePair == linkedNodes.end())
  {
    throw std::invalid_argument("node not in bond");
  } else {
    auto branch = node.get_branch_including(nodePair->first, *this);
    for (auto &nodePointer: branch)
    {
      double x = nodePointer->get_x() - node.get_x();
      double y = nodePointer->get_y() - node.get_y();
      double s = std::sin(degrees * std::numbers::pi / 180);
      double c = std::cos(degrees * std::numbers::pi / 180);
      nodePointer->set_x_y(node.get_x() + x * c + y * s, node.get_y() + y * c - x * s);
      nodePointer->refresh_predicted_next_bond_angle_list();
    }
    node.refresh_predicted_next_bond_angle_list();
  }
}
void kynedraw::VisibleBond::set_rtree_coordinates(kynedraw::VisibleNode &changingNode, double initialX, double initialY, double finalX, double finalY) {
  for (auto& currentPair : linkedNodes)
  {
    auto nodePointer = currentPair.second;
    if (*nodePointer != changingNode)
    {
      // nodePointer is the other node, preserve its coordinates
      // TODO: figure out the best way to save the order of the points in the segment, or if the order even matters
      int status = rtree->remove(std::make_pair(segment(point(initialX, initialY),
                                          point(nodePointer->get_x(), nodePointer->get_y())), uuid));
      if (status == 1)
      {
        // status == 1 means success, so insert the point; otherwise, switch the order
        rtree->insert(std::make_pair(segment(point(finalX, finalY),
                                             point(nodePointer->get_x(), nodePointer->get_y())), uuid));
      } else {
        rtree->remove(std::make_pair(segment(point(nodePointer->get_x(), nodePointer->get_y()),
                                             point(initialX, initialY)), uuid));
        rtree->insert(std::make_pair(segment(point(nodePointer->get_x(), nodePointer->get_y()),
                                             point(finalX, finalY)),uuid));
      }
      break;
    }
  }
  // it may seem wasteful to set BOTH nodes, but boost rtrees are currently not mutable so we're going to have to delete and insert the entire segment anyways
}
void kynedraw::VisibleBond::remove()
{
  for (auto& [bondIndexInNode, nodePointer] : linkedNodes)
  {
    nodePointer->remove_bond_info(bondIndexInNode, *this);
  }
  kynedraw::VisibleNode& node0 = get_node(0);
  kynedraw::VisibleNode& node1 = get_node(1);
  rtree->remove(std::make_pair(segment(point(node0.get_x(), node0.get_y()), point(node1.get_x(), node1.get_y())), uuid));
  linkedGraph->remove_visible_bond(*this);
}

/***********************************************************************************************************************
 * Graph
***********************************************************************************************************************/

const std::unordered_map<boost::uuids::uuid, kynedraw::VisibleNode, boost::hash<boost::uuids::uuid>> &kynedraw::Graph::get_visible_nodes() const {
  return visibleNodes;
}
const std::unordered_map<boost::uuids::uuid, kynedraw::Node, boost::hash<boost::uuids::uuid>> &kynedraw::Graph::get_nodes() const {
  return nodes;
}
const std::unordered_map<boost::uuids::uuid, kynedraw::VisibleBond, boost::hash<boost::uuids::uuid>> &kynedraw::Graph::get_visible_bonds() const {
  return visibleBonds;
}
const std::unordered_map<boost::uuids::uuid, kynedraw::Bond, boost::hash<boost::uuids::uuid>> &kynedraw::Graph::get_bonds() const {
  return bonds;
}
kynedraw::Node &kynedraw::Graph::create_node(boost::uuids::uuid uuid, std::string name) {
  kynedraw::Node newNode(uuid, name, *this);
  kynedraw::Node &insertedNode = nodes.try_emplace(uuid, newNode).first->second;
  return insertedNode;
}
kynedraw::VisibleNode &kynedraw::Graph::create_visible_node(boost::uuids::uuid uuid,
                                                            std::string name,
                                                            double pageX,
                                                            double pageY) {
  kynedraw::VisibleNode newNode(uuid, name, pageX, pageY, points, *this);
  points.insert(std::make_pair(point(pageX, pageY), uuid));
  kynedraw::VisibleNode &insertedNode = visibleNodes.try_emplace(uuid, newNode).first->second;
  insertedNode.refresh_predicted_next_bond_angle_list();
  return insertedNode;
}
kynedraw::Bond &kynedraw::Graph::create_bond_between(boost::uuids::uuid uuid,
                                                     int numBonds,
                                                     kynedraw::Node &node0,
                                                     kynedraw::Node &node1) {
  kynedraw::Bond newBond(uuid, numBonds, *this);
  kynedraw::Bond &insertedBond = bonds.try_emplace(uuid, newBond).first->second;
  int bondIndexInNode0 = node0.add_bond_info(0, insertedBond);
  int bondIndexInNode1 = node1.add_bond_info(1, insertedBond);
  insertedBond.set_linked_node(0, bondIndexInNode0, node0);
  insertedBond.set_linked_node(1, bondIndexInNode1, node1);
  return insertedBond;
}
kynedraw::VisibleBond &kynedraw::Graph::create_visible_bond_between(boost::uuids::uuid uuid,
                                                                    int numBonds,
                                                                    kynedraw::VisibleNode &node0,
                                                                    kynedraw::VisibleNode &node1) {
  kynedraw::VisibleBond newBond(uuid, numBonds, segments, *this);
  VisibleBond &insertedBond = visibleBonds.try_emplace(uuid, newBond).first->second;
  int bondIndexInNode0 = node0.add_bond_info(0, insertedBond);
  int bondIndexInNode1 = node1.add_bond_info(1, insertedBond);
  insertedBond.set_linked_node(0, bondIndexInNode0, node0);
  insertedBond.set_linked_node(1, bondIndexInNode1, node1);
  node0.refresh_predicted_next_bond_angle_list();
  node1.refresh_predicted_next_bond_angle_list();
                       segments.insert(std::make_pair(segment(point(node0.get_x(), node0.get_y()), point(node1.get_x(), node1.get_y())),
                                 uuid));
  return insertedBond;
}
void kynedraw::Graph::remove_node(kynedraw::Node &node) {
  nodes.erase(node.get_uuid());
}
void kynedraw::Graph::remove_visible_node(kynedraw::VisibleNode &node) {
  visibleNodes.erase(node.get_uuid());
}
void kynedraw::Graph::remove_bond(kynedraw::Bond &bond) {
  bonds.erase(bond.get_uuid());
}
void kynedraw::Graph::remove_visible_bond(kynedraw::VisibleBond &bond) {
  visibleBonds.erase(bond.get_uuid());
}
void kynedraw::Graph::set_node_uuid(kynedraw::Node &node, boost::uuids::uuid newUuid) {
  auto mapNode = nodes.extract(node.get_uuid());
  mapNode.key() = newUuid;
  nodes.insert(std::move(mapNode));
}
void kynedraw::Graph::set_visible_node_uuid(kynedraw::VisibleNode &visibleNode, boost::uuids::uuid newUuid) {
  auto mapNode = visibleNodes.extract(visibleNode.get_uuid());
  mapNode.key() = newUuid;
  visibleNodes.insert(std::move(mapNode));
}
void kynedraw::Graph::merge(kynedraw::Graph &sacrificialGraph) {
  this->nodes.merge(sacrificialGraph.nodes);
  for (auto& [nodeUuid, node] : sacrificialGraph.nodes) {
    this->nodes.at(nodeUuid).merge(node);
  }
  sacrificialGraph.nodes.clear();
  this->visibleNodes.merge(sacrificialGraph.visibleNodes);
  for (auto& [uuid, node] : sacrificialGraph.visibleNodes) {
    this->visibleNodes.at(uuid).merge(node);
  }
  sacrificialGraph.visibleNodes.clear();
  this->bonds.merge(sacrificialGraph.bonds);
  sacrificialGraph.bonds.clear();
  this->visibleBonds.merge(sacrificialGraph.visibleBonds);
  sacrificialGraph.visibleBonds.clear();
  this->segments.insert(sacrificialGraph.segments.begin(), sacrificialGraph.segments.end());
  sacrificialGraph.segments.clear();
  this->points.insert(sacrificialGraph.points.begin(), sacrificialGraph.points.end());
  sacrificialGraph.points.clear();
}
void kynedraw::Graph::clear() {
  nodes.clear();
  visibleNodes.clear();
  bonds.clear();
  visibleBonds.clear();
  segments.clear();
  points.clear();
}
void kynedraw::Graph::change_x_y(double changeX, double changeY) {
  for (auto&[uuid, currentVisibleNode] : visibleNodes) {
    currentVisibleNode.change_x_y(changeX, changeY, false);
  }
}
kynedraw::VisibleNode &kynedraw::Graph::find_closest_visible_node_to(double x, double y) {
  // NOTE: if ans.size() is 0 (that is, there are no visible nodes to be closest to), this will throw an error
  // Check for ans.size through get_visible_nodes().size() whenever you call this function
  std::vector<std::pair<point, boost::uuids::uuid>> ans;
  points.query(bgi::nearest(point(x, y), 1), std::back_inserter(ans));
  return visibleNodes.at(ans[0].second);
}
kynedraw::VisibleBond &kynedraw::Graph::find_closest_visible_bond_to(double x, double y) {
  // NOTE: if ans.size() is 0 (that is, there are no visible bonds to be closest to), this will throw an error
  // Check for ans.size through get_visible_bonds().size() whenever you call this function
  std::vector<std::pair<segment, boost::uuids::uuid>> ans;
  segments.query(bgi::nearest(point(x, y), 1), std::back_inserter(ans));
  return visibleBonds.at(ans[0].second);
}
kynedraw::VisibleNode& kynedraw::Preview::get_mouse_node() const {
  return *mouseNode;
}
void kynedraw::Preview::set_mouse_node(kynedraw::VisibleNode& mouseNode) {
  this->mouseNode = &mouseNode;
}
const std::optional<kynedraw::VisibleBond*>& kynedraw::Preview::get_mouse_bond() const {
  return mouseBond;
}
void kynedraw::Preview::set_mouse_bond(kynedraw::VisibleBond& mouseBond) {
  this->mouseBond.emplace(&mouseBond);
}
void kynedraw::Preview::clear()
{
  kynedraw::Graph::clear();
  mouseNode = nullptr;
  mouseBond.reset();
}