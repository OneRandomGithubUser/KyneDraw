#include <cmath>
#include <unordered_map>
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
  std::cout << changeValence << "\n";
  numH -= changeValence;
  refresh_internal_vars();
}
void kynedraw::GenericNode::smart_change_num_bonds(int changeNumBonds) {
  std::cout << "before" << numBonds << "after ";
  numBonds += changeNumBonds;
  numH -= changeNumBonds;
  refresh_internal_vars();
  std::cout << numBonds << "\n";
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
  std::cout << sacrificialNode.get_num_bonds() << "\n";
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
const std::vector<std::pair<int, kynedraw::Bond*>>& kynedraw::Node::get_linked_bonds() const {
  return linkedBonds;
}
const std::vector<kynedraw::VisibleNode *>& kynedraw::Node::get_linked_nodes() const {
  return linkedNodes;
}
void kynedraw::Node::add_bond_info(int index, kynedraw::Bond& bond) {
  linkedBonds.emplace_back(index, &bond);
  smart_change_num_bonds(bond.get_num_bonds());
}
void kynedraw::Node::remove_bond_info(kynedraw::Bond& bond) {
  linkedBonds.erase(std::find_if(linkedBonds.begin(), linkedBonds.end(),
                                 [&bond](auto& currentPair) {return currentPair.second == &bond;}));
  smart_change_num_bonds(-bond.get_num_bonds());
}
void kynedraw::Node::merge(kynedraw::Node& sacrificialNode)
{
  this->kynedraw::GenericNode::merge(sacrificialNode);
  for (auto& [index, bondPointer] : sacrificialNode.linkedBonds)
  {
    bondPointer->set_linked_node(index, *this);
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
const std::vector<std::pair<int, kynedraw::VisibleBond*>>& kynedraw::VisibleNode::get_linked_bonds() const {
  return linkedBonds;
}
const std::vector<kynedraw::Node*> &kynedraw::VisibleNode::get_linked_nodes() const {
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
void kynedraw::VisibleNode::change_x(double change_x) {
  this->set_rtree_coordinates(x, y, x + change_x, y);
  x += change_x;
}
void kynedraw::VisibleNode::set_x(double x) {
  this->set_rtree_coordinates(this->x, y, x, y);
  this->x = x;
}
double kynedraw::VisibleNode::get_y() const {
  return y;
}
void kynedraw::VisibleNode::change_y(double change_y) {
  this->set_rtree_coordinates(x, y, x, y + change_y);
  this->y += change_y;
}
void kynedraw::VisibleNode::set_y(double y) {
  this->set_rtree_coordinates(x, this->y, x, y);
  this->y = y;
}
void kynedraw::VisibleNode::change_x_y(double change_x, double change_y) {
  this->set_rtree_coordinates(x, y, x + change_x, y + change_y);
  x += change_x;
  y += change_y;
}
void kynedraw::VisibleNode::set_x_y(double x, double y) {
  this->set_rtree_coordinates(this->x, this->y, x, y);
  this->x = x;
  this->y = y;
}
void kynedraw::VisibleNode::add_bond_info(int index, kynedraw::VisibleBond& bond) {
  linkedBonds.emplace_back(index, &bond);
  smart_change_num_bonds(bond.get_num_bonds());
}
void kynedraw::VisibleNode::remove_bond_info(kynedraw::VisibleBond& bond) {
  linkedBonds.erase(std::find_if(linkedBonds.begin(), linkedBonds.end(),
                              [&bond](auto& currentPair) {return currentPair.second == &bond;}));
  smart_change_num_bonds(-bond.get_num_bonds());
}
void kynedraw::VisibleNode::merge(kynedraw::VisibleNode& sacrificialNode)
{
  // NOTE: this tolerance of 0.1% is to account for floating point errors and can be adjusted as necessary
  // it shouldn't be important since they should have exactly the same coordinates anyways
  // this is why it uses a box rather than a circle to check their coordinates as the exact shape doesn't matter
  if (abs(x-sacrificialNode.get_x())/(x) > 0.001 || abs(y-sacrificialNode.get_y())/(y) > 0.001)
  {
    throw std::invalid_argument("tried to merge visibleNodes with different positions");
  }
  this->kynedraw::GenericNode::merge(sacrificialNode);
  for (auto& [index, bondPointer] : sacrificialNode.linkedBonds)
  {
    bondPointer->set_linked_node(index, *this);
  }
  sacrificialNode.linkedBonds.clear();
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
                                   kynedraw::Node &node0,
                                   kynedraw::Node &node1,
                                   kynedraw::Graph& linkedGraph) : GenericBond(uuid, numBonds, linkedGraph)
{
  this->linkedNodes.at(0) = &node0;
  this->linkedNodes.at(1) = &node1;
}
const std::array<kynedraw::Node*, 2>& kynedraw::Bond::get_linked_nodes() const {
  // NOTE: linkedNodes should ALWAYS only have two elements
  return linkedNodes;
}
void kynedraw::Bond::set_linked_node(int index, kynedraw::Node& newNode)
{
  linkedNodes.at(index) = &newNode;
}
kynedraw::Node& kynedraw::Bond::get_first_node() const
{
  return *(linkedNodes.at(0));
}
kynedraw::Node& kynedraw::Bond::get_first_node()
{
  return *(linkedNodes.at(0));
}
kynedraw::Node& kynedraw::Bond::get_second_node() const
{
  return *(linkedNodes.at(1));
}
kynedraw::Node& kynedraw::Bond::get_second_node()
{
  return *(linkedNodes.at(1));
}
void kynedraw::Bond::remove() {
  for (auto& nodePointer : linkedNodes)
  {
    nodePointer->remove_bond_info(*this);
  }
  linkedGraph->remove_bond(*this);
}
kynedraw::VisibleBond::VisibleBond(boost::uuids::uuid uuid,
                                   int numBonds,
                                   kynedraw::VisibleNode &node0,
                                   kynedraw::VisibleNode &node1,
                                   segment_rtree &rtree,
                                   kynedraw::Graph& linkedGraph) : GenericBond(uuid, numBonds, linkedGraph)
{
  this->linkedNodes.at(0) = &node0;
  this->linkedNodes.at(1) = &node1;
  this->rtree = &rtree;
}
double kynedraw::VisibleBond::get_bond_angle() const
{
  return bondAngle;
}
void kynedraw::VisibleBond::refresh_bond_angle()
{
  bondAngle = atan2(get_first_node().get_y(), get_first_node().get_x());
}
const std::array<kynedraw::VisibleNode*, 2>& kynedraw::VisibleBond::get_linked_nodes() const {
  // NOTE: linkedNodes should ALWAYS only have two elements
  return linkedNodes;
}
void kynedraw::VisibleBond::set_linked_node(int index, kynedraw::VisibleNode& newNode)
{
  linkedNodes.at(index) = &newNode;
}
kynedraw::VisibleNode& kynedraw::VisibleBond::get_first_node() const
{
  return *(linkedNodes.at(0));
}
kynedraw::VisibleNode& kynedraw::VisibleBond::get_first_node()
{
  return *(linkedNodes.at(0));
}
kynedraw::VisibleNode& kynedraw::VisibleBond::get_second_node() const
{
  return *(linkedNodes.at(1));
}
kynedraw::VisibleNode& kynedraw::VisibleBond::get_second_node()
{
  return *(linkedNodes.at(1));
}
void kynedraw::VisibleBond::set_rtree_coordinates(kynedraw::VisibleNode &changingNode, double initialX, double initialY, double finalX, double finalY) {
  for (auto& nodePointer : linkedNodes)
  {
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
  for (auto& nodePointer : linkedNodes)
  {
    nodePointer->remove_bond_info(*this);
  }
  kynedraw::VisibleNode& node0 = get_first_node();
  kynedraw::VisibleNode& node1 = get_second_node();
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
  return insertedNode;
}
kynedraw::Bond &kynedraw::Graph::create_bond_between(boost::uuids::uuid uuid,
                                                     int numBonds,
                                                     kynedraw::Node &node0,
                                                     kynedraw::Node &node1) {
  kynedraw::Bond newBond(uuid, numBonds, node0, node1, *this);
  kynedraw::Bond &insertedBond = bonds.try_emplace(uuid, newBond).first->second;
  node0.add_bond_info(0, insertedBond);
  node1.add_bond_info(1, insertedBond);
  return insertedBond;
}
kynedraw::VisibleBond &kynedraw::Graph::create_visible_bond_between(boost::uuids::uuid uuid,
                                                                    int numBonds,
                                                                    kynedraw::VisibleNode &node0,
                                                                    kynedraw::VisibleNode &node1) {
  kynedraw::VisibleBond newBond(uuid, numBonds, node0, node1, segments, *this);
  VisibleBond &insertedBond = visibleBonds.try_emplace(uuid, newBond).first->second;
  node0.add_bond_info(0, insertedBond);
  node1.add_bond_info(1, insertedBond);
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
    currentVisibleNode.change_x_y(changeX, changeY);
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
kynedraw::VisibleNode &kynedraw::Preview::get_mouse_node() const {
  return *mouseNode;
}
void kynedraw::Preview::set_mouse_node(kynedraw::VisibleNode &mouseNode) {
  this->mouseNode = &mouseNode;
}