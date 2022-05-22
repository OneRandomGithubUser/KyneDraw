#include <boost/uuid/uuid.hpp>
#include <boost/uuid/uuid_generators.hpp>
#include <boost/geometry.hpp>
#include <boost/geometry/geometries/point.hpp>
#include <boost/geometry/geometries/segment.hpp>
#include <boost/geometry/index/rtree.hpp>

import kynedraw;

kynedraw::GenericBond::GenericBond(boost::uuids::uuid uuid, int numBonds) {
  this->uuid = uuid;
  this->numBonds = numBonds;
}
boost::uuids::uuid kynedraw::GenericBond::get_uuid() const {
  return uuid;
}
kynedraw::Bond::Bond(boost::uuids::uuid uuid, int numBonds, kynedraw::Node &node1, kynedraw::Node &node2) : GenericBond(uuid, numBonds)
{
  this->linkedNodes.push_back(&node1);
  this->linkedNodes.push_back(&node2);
}
const std::vector<kynedraw::Node *> &kynedraw::Bond::get_linked_nodes() const {
  return linkedNodes;
}
kynedraw::VisibleBond::VisibleBond(boost::uuids::uuid uuid,
                                   int numBonds,
                                   kynedraw::VisibleNode &node1,
                                   kynedraw::VisibleNode &node2,
                                   segment_rtree &rtree) : GenericBond(uuid, numBonds)
{
  this->linkedNodes.push_back(&node1);
  this->linkedNodes.push_back(&node2);
  this->rtree = &rtree;
}
const std::vector<kynedraw::VisibleNode *> &kynedraw::VisibleBond::get_linked_nodes() const {
  return linkedNodes;
}
void kynedraw::VisibleBond::set_rtree_coordinates(int bondIndex, double initialX, double initialY, double finalX, double finalY) {
  // it may seem wasteful to refresh BOTH nodes, but it seems that boost rtrees are currently not mutable so we're going to have to delete and insert the entire segment anyways0
  switch (bondIndex) {
    case 0:
      rtree->remove(std::make_pair(segment(point(initialX, initialY), point(linkedNodes[1]->get_x(),linkedNodes[1]->get_y())), uuid));
      rtree->insert(std::make_pair(segment(point(finalX, finalY), point(linkedNodes[1]->get_x(), linkedNodes[1]->get_y())), uuid));
      break;
    case 1:
      rtree->remove(std::make_pair(segment(point(linkedNodes[0]->get_x(),linkedNodes[0]->get_y()), point(initialX, initialY)), uuid));
      rtree->insert(std::make_pair(segment(point(linkedNodes[0]->get_x(), linkedNodes[0]->get_y()), point(finalX, finalY)), uuid));
      break;
  }
}
