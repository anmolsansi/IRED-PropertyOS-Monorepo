async function test() {
  const token = process.env.CLERK_TOKEN || "";
  console.log("Testing States endpoint...");
  const res = await fetch("http://localhost:4000/api/v1/reference/states");
  const states = await res.json();
  console.log(states);
  if (states.data && states.data.length > 0) {
    const stateId = states.data[0].id;
    console.log(`Testing Cities for state ${stateId}...`);
    const cityRes = await fetch(`http://localhost:4000/api/v1/reference/states/${stateId}/cities`);
    console.log(await cityRes.json());
  }
}
test();
