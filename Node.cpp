#include <boost/uuid/uuid.hpp>
#include <boost/uuid/uuid_generators.hpp>
#include <boost/geometry.hpp>
#include <boost/geometry/geometries/point.hpp>
#include <boost/geometry/geometries/segment.hpp>
#include <boost/geometry/index/rtree.hpp>

import kynedraw;

kynedraw::GenericNode::GenericNode(boost::uuids::uuid uuid, std::string name) {
  this->uuid = uuid;
  this->name = name;
}
boost::uuids::uuid kynedraw::GenericNode::get_uuid() const {
  return uuid;
}
std::string kynedraw::GenericNode::get_name() const {
  return name;
}
bool kynedraw::GenericNode::operator==(const kynedraw::GenericNode &rhs) const noexcept {
  return this->uuid == rhs.uuid;
}
kynedraw::Node::Node(boost::uuids::uuid uuid, std::string name) : GenericNode(uuid, name)
{
  //
}
const std::vector<std::pair<kynedraw::Bond *, int>> &kynedraw::Node::get_linked_bonds() const {
  return linkedBonds;
}
const std::vector<kynedraw::VisibleNode *> &kynedraw::Node::get_linked_nodes() const {
  return linkedNodes;
}
void kynedraw::Node::add_bond_info(kynedraw::Bond& bond, int bondIndex) {
  this->linkedBonds.push_back(std::make_pair(&bond, bondIndex));
}
kynedraw::VisibleNode::VisibleNode(boost::uuids::uuid uuid,
                                   std::string name,
                                   double x,
                                   double y,
                                   kynedraw::point_rtree &rtree) : GenericNode(uuid, name)
{
  this->x = x;
  this->y = y;
  this->rtree = &rtree;
}
const std::vector<std::pair<kynedraw::VisibleBond *, int>> &kynedraw::VisibleNode::get_linked_bonds() const {
  return linkedBonds;
}
const std::vector<kynedraw::Node *> &kynedraw::VisibleNode::get_linked_nodes() const {
  return linkedNodes;
}
void kynedraw::VisibleNode::set_rtree_coordinates(double initialX, double initialY, double finalX, double finalY) {
  // though I wish you could call this without any parameters, boost's rtree does not let me remove a point unless I know where it is
  // why I can't remove it if I just know its Indexable ID, I do not know
  rtree->remove(std::make_pair(point(initialX, initialY), uuid));
  rtree->insert(std::make_pair(point(finalX, finalY), uuid));
  for (auto& linkedBond : linkedBonds)
  {
    linkedBond.first->set_rtree_coordinates(linkedBond.second, initialX, initialY, finalX, finalY);
  }
}
double kynedraw::VisibleNode::get_x() const {
  return x;
}
void kynedraw::VisibleNode::change_x(double change_x) {
  this->set_rtree_coordinates(x, y, x + change_x, y);
  this->x += change_x;
}
void kynedraw::VisibleNode::set_x(double x) {
  this->set_rtree_coordinates(this->x, this->y, x, this->y);
  this->x = x;
}
void kynedraw::VisibleNode::change_y(double change_y) {
  this->set_rtree_coordinates(x, y, x, y + change_y);
  this->y += change_y;
}
double kynedraw::VisibleNode::get_y() const {
  return y;
}
void kynedraw::VisibleNode::set_y(double y) {
  this->set_rtree_coordinates(this->x, this->y, this->x, y);
  this->y = y;
}
void kynedraw::VisibleNode::add_bond_info(kynedraw::VisibleBond &bond, int bondIndex) {
  this->linkedBonds.push_back(std::make_pair(&bond, bondIndex));
}
